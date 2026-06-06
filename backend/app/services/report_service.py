import mimetypes
import re
import unicodedata
import uuid
from datetime import datetime, time
from pathlib import Path

import httpx
from app.core.config import get_settings
from jinja2 import Environment, FileSystemLoader, select_autoescape


class ReportService:
    def __init__(self, session=None) -> None:
        self.settings = get_settings()
        self.session = session

    async def generate_pdf(self, shift, events, machine_setups=None) -> str:
        from xhtml2pdf import pisa

        reports_dir = Path(self.settings.reports_dir)
        reports_dir.mkdir(parents=True, exist_ok=True)

        templates_dir = Path("app/templates")
        env = Environment(
            loader=FileSystemLoader(templates_dir),
            autoescape=select_autoescape(["html", "xml"]),
        )
        template = env.get_template("report.html")
        
        machine_groups = self._build_machine_groups(shift, events, machine_setups or [])

        # Prefetch remote images to local files to avoid remote fetch/format issues
        tmp_files = self._prefetch_images(machine_groups, reports_dir)

        try:
            html_content = template.render(shift=shift, machine_groups=machine_groups)

            output_file = reports_dir / f"reporte_turno_{shift.id}.pdf"
            with open(output_file, "wb") as pdf_file:
                result = pisa.CreatePDF(html_content, dest=pdf_file)
            if result.err:
                raise RuntimeError(f"Error al generar el PDF: {result.err}")
            return f"/static/reports/{output_file.name}"
        finally:
            # Clean up temporary downloaded files
            for p in tmp_files:
                try:
                    p.unlink()
                except Exception:
                    pass

    def _prefetch_images(self, machine_groups: list, reports_dir: Path) -> list[Path]:
        tmp_dir = reports_dir / "tmp_images"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        downloaded: list[Path] = []

        image_fields = [
            "img_materias_primas",
            "img_condiciones_proceso",
            "img_temp_secadores",
            "img_extraccion_adhesivo",
            "img_tiempo_paradas_turno_maquina",
        ]

        def _ensure_list(value):
            if value is None:
                return []
            if isinstance(value, list):
                return value
            return [value]

        for group in machine_groups:
            # Check setup and orders
            targets = []
            setup = group.get("setup")
            if setup:
                targets.append(setup)
            for order in group.get("orders", []):
                targets.append(order)
            # events may have image_path
            for ev in group.get("events", []):
                path = ev.get("image_path")
                if path and isinstance(path, str) and path.lower().startswith("http"):
                    try:
                        saved = self._download_remote_image(path, tmp_dir)
                        ev["image_path"] = f"file://{saved.resolve().as_posix()}"
                        downloaded.append(saved)
                    except Exception as exc:
                        raise RuntimeError(f"Error descargando imagen de evento: {path} -> {exc}")

            for item in targets:
                for field in image_fields:
                    raw = item.get(field)
                    items = _ensure_list(raw)
                    new_items = []
                    for img in items:
                        # support stored objects {"url":..., "title":...} or plain strings
                        img_url = img.get("url") if isinstance(img, dict) else img
                        img_title = img.get("title") if isinstance(img, dict) else None
                        if not img_url or not isinstance(img_url, str) or not img_url.lower().startswith("http"):
                            new_items.append(img)
                            continue
                        try:
                            saved = self._download_remote_image(img_url, tmp_dir)
                            downloaded.append(saved)
                            local_ref = f"file://{saved.resolve().as_posix()}"
                            if isinstance(img, dict):
                                new_items.append({"url": local_ref, "title": img_title})
                            else:
                                new_items.append(local_ref)
                        except Exception as exc:
                            raise RuntimeError(f"Error descargando imagen: {img_url} -> {exc}")
                    item[field] = new_items

        return downloaded

    def _download_remote_image(self, url: str, target_dir: Path) -> Path:
        try:
            with httpx.Client(timeout=20.0, verify=True) as client:
                resp = client.get(url)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "")
                ext = None
                if content_type:
                    ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
                if not ext:
                    # try to infer from URL path
                    path = url.split("?")[0]
                    if "." in path:
                        ext = "." + path.rsplit(".", 1)[1]
                if not ext:
                    ext = ".jpg"

                dest = target_dir / f"{uuid.uuid4().hex}{ext}"
                dest.write_bytes(resp.content)
                return dest
        except Exception as exc:
            raise

    def _format_time(self, value: time | None) -> str:
        if value is None:
            return "hora no registrada"
        return value.strftime("%H:%M")

    def _format_datetime(self, value: datetime | None) -> str:
        if value is None:
            return "no registrada"
        return value.strftime("%d/%m/%Y %H:%M")

    def _combine_shift_datetime(self, shift, value: time | None) -> datetime | None:
        if value is None:
            return None
        return datetime.combine(shift.shift_date, value)

    def _to_naive_datetime(self, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value
        return value.replace(tzinfo=None)

    def _normalize(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
        return normalized.lower()

    def _natural_machine_sort_key(self, group: dict) -> list:
        label = f"{group.get('machine_code') or ''} {group.get('machine_name') or ''}"
        normalized = self._normalize(label)
        parts = re.split(r"(\d+)", normalized)
        return [int(part) if part.isdigit() else part for part in parts]

    def _serialize_setup(self, setup) -> dict:
        if setup is None:
            return {
                "id": None,
                "machine_status": None,
                "order_status": None,
                "machine_status_description": None,
                "work_order": None,
                "ref_order": None,
                "meters_to_produce": None,
                "product_to_laminate": None,
                "created_at": None,
                "closed_at": None,
                "created_at_display": None,
                "closed_at_display": None,
                "events": [],
                "img_materias_primas": None,
                "img_condiciones_proceso": None,
                "img_temp_secadores": None,
                "img_extraccion_adhesivo": None,
                "img_tiempo_paradas_turno_maquina": None,
            }

        return {
            "id": str(setup.id),
            "machine_status": setup.machine_status,
            "order_status": getattr(setup, "order_status", None),
            "machine_status_description": setup.machine_status_description,
            "work_order": setup.work_order,
            "ref_order": setup.ref_order,
            "meters_to_produce": setup.meters_to_produce,
            "product_to_laminate": setup.product_to_laminate,
            "created_at": setup.created_at,
            "closed_at": getattr(setup, "closed_at", None),
            "created_at_display": self._format_datetime(setup.created_at),
            "closed_at_display": self._format_datetime(getattr(setup, "closed_at", None)),
            "events": [],
            "img_materias_primas": setup.img_materias_primas,
            "img_condiciones_proceso": setup.img_condiciones_proceso,
            "img_temp_secadores": setup.img_temp_secadores,
            "img_extraccion_adhesivo": setup.img_extraccion_adhesivo,
            "img_tiempo_paradas_turno_maquina": setup.img_tiempo_paradas_turno_maquina,
        }

    def _serialize_shift_legacy_setup(self, shift) -> dict:
        return {
            "id": None,
            "machine_status": shift.machine_status,
            "order_status": "open",
            "machine_status_description": shift.machine_status_description,
            "work_order": shift.work_order,
            "ref_order": shift.ref_order,
            "meters_to_produce": shift.meters_to_produce,
            "product_to_laminate": shift.product_to_laminate,
            "created_at": shift.start_time,
            "closed_at": None,
            "created_at_display": self._format_datetime(shift.start_time),
            "closed_at_display": None,
            "events": [],
            "img_materias_primas": shift.img_materias_primas,
            "img_condiciones_proceso": shift.img_condiciones_proceso,
            "img_temp_secadores": shift.img_temp_secadores,
            "img_extraccion_adhesivo": shift.img_extraccion_adhesivo,
            "img_tiempo_paradas_turno_maquina": shift.img_tiempo_paradas_turno,
        }

    def _build_event_payload(self, event) -> dict:
        return {
            "event_time": self._format_time(event.event_time),
            "event_end_time": self._format_time(event.event_end_time) if getattr(event, "event_end_time", None) else None,
            "description": event.description,
            "image_path": event.image_path,
        }

    def _assign_events_to_orders(self, shift, machine_events: list, machine_orders: list[dict]) -> list[dict]:
        if not machine_orders:
            return []

        events_by_order: dict[str | None, list] = {order["id"]: [] for order in machine_orders}
        open_order_id = None
        for order in machine_orders:
            if order.get("order_status") != "closed":
                open_order_id = order.get("id")

        shifted_events = []
        for event in machine_events:
            event_dt = self._to_naive_datetime(
                self._combine_shift_datetime(shift, getattr(event, "event_time", None))
            )
            shifted_events.append((event, event_dt))

        for event, event_dt in shifted_events:
            matched_order_id = getattr(event, "shift_setup_id", None)

            # Prefer explicit order linkage captured at event creation.
            if matched_order_id is not None:
                matched_order_id = str(matched_order_id)
                events_by_order.setdefault(matched_order_id, []).append(event)
                continue

            matched_order_id = open_order_id
            for index, order in enumerate(machine_orders):
                created_at = order.get("created_at")
                closed_at = order.get("closed_at")
                if created_at is None:
                    continue
                next_created_at = machine_orders[index + 1].get("created_at") if index + 1 < len(machine_orders) else None
                lower_bound = self._to_naive_datetime(created_at)
                upper_bound = self._to_naive_datetime(closed_at or next_created_at)
                if event_dt is None:
                    continue
                if event_dt >= lower_bound and (upper_bound is None or event_dt < upper_bound):
                    matched_order_id = order.get("id")
                    break
            events_by_order.setdefault(matched_order_id, []).append(event)

        for order in machine_orders:
            order_events = events_by_order.get(order.get("id"), [])
            order["events"] = [self._build_event_payload(event) for event in order_events]

        return machine_orders

    def _build_machine_groups(self, shift, events, machine_setups) -> list[dict]:
        setups_by_machine: dict[str, list] = {}
        for setup in machine_setups:
            key = str(setup.machine_id)
            setups_by_machine.setdefault(key, []).append(setup)

        grouped: dict[str, dict] = {}
        events_by_machine: dict[str, list] = {}
        for event in events:
            machine_id = str(getattr(event, "machine_id", "")) if getattr(event, "machine_id", None) else None
            if getattr(event, "machine", None) is not None:
                machine_id = str(event.machine.id)
            elif getattr(shift, "machine", None) is not None and machine_id is None:
                machine_id = str(shift.machine.id)
            machine_key = machine_id or "unknown"
            events_by_machine.setdefault(machine_key, []).append(event)

        for machine_id, machine_events in events_by_machine.items():
            machine_name = "Maquina no identificada"
            machine_code = "N/A"
            if machine_events and getattr(machine_events[0], "machine", None) is not None:
                machine_name = machine_events[0].machine.name
                machine_code = machine_events[0].machine.code
            elif getattr(shift, "machine", None) is not None and machine_id == str(shift.machine_id):
                machine_name = shift.machine.name
                machine_code = shift.machine.code

            machine_setups_for_machine = setups_by_machine.get(machine_id, [])
            latest_setup = machine_setups_for_machine[-1] if machine_setups_for_machine else None
            setup_payload = self._serialize_setup(latest_setup)
            if latest_setup is None and machine_id == str(shift.machine_id):
                setup_payload = self._serialize_shift_legacy_setup(shift)

            orders = [self._serialize_setup(item) for item in machine_setups_for_machine]
            if not orders and setup_payload.get("work_order"):
                orders = [setup_payload]
            orders = self._assign_events_to_orders(shift, machine_events, orders)

            grouped[machine_id] = {
                "machine_id": machine_id,
                "machine_name": machine_name,
                "machine_code": machine_code,
                "setup": setup_payload,
                "orders": orders,
                "events": [self._build_event_payload(event) for event in machine_events],
            }

        # Include setups for machines that have startup data even if they have no events.
        for machine_id, machine_setups_for_machine in setups_by_machine.items():
            if not machine_setups_for_machine:
                continue
            setup = machine_setups_for_machine[-1]
            machine_key = str(machine_id)
            if machine_key in grouped:
                continue
            machine_name = setup.machine.name if getattr(setup, "machine", None) is not None else "Máquina no identificada"
            machine_code = setup.machine.code if getattr(setup, "machine", None) is not None else "N/A"
            orders = [self._serialize_setup(item) for item in machine_setups_for_machine]
            orders = self._assign_events_to_orders(shift, [], orders)
            grouped[machine_key] = {
                "machine_id": str(machine_id),
                "machine_name": machine_name,
                "machine_code": machine_code,
                "setup": self._serialize_setup(setup),
                "orders": orders,
                "events": [],
            }

        # Include legacy shift-level setup for the primary machine when no machine setup exists.
        primary_machine_key = str(shift.machine_id) if getattr(shift, "machine_id", None) is not None else None
        if primary_machine_key and primary_machine_key not in grouped and getattr(shift, "machine_status", None) is not None:
            setup_payload = self._serialize_shift_legacy_setup(shift)
            orders = [setup_payload] if setup_payload.get("work_order") else []
            machine_name = shift.machine.name if getattr(shift, "machine", None) is not None else "Máquina no identificada"
            machine_code = shift.machine.code if getattr(shift, "machine", None) is not None else "N/A"
            grouped[primary_machine_key] = {
                "machine_id": primary_machine_key,
                "machine_name": machine_name,
                "machine_code": machine_code,
                "setup": setup_payload,
                "orders": orders,
                "events": [],
            }

        return sorted(grouped.values(), key=self._natural_machine_sort_key)
