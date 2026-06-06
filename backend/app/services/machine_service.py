from datetime import date

from app.models.machine import Machine
from app.repositories.machine_repository import MachineRepository
from app.repositories.shift_machine_setup_repository import \
    ShiftMachineSetupRepository
from app.schemas.machine import MachineCreate, MachineDashboardStatusUpdate
from sqlalchemy.ext.asyncio import AsyncSession


class MachineService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = MachineRepository(session)
        self.shift_setup_repository = ShiftMachineSetupRepository(session)

    def _area_ids_for_user(self, user) -> list | None:
        if user is None or getattr(user, "role", None) == "admin":
            return None
        return [area.id for area in getattr(user, "areas", [])]

    def _is_real_order_value(self, order_value: str | None) -> bool:
        if not order_value:
            return False
        normalized = order_value.strip()
        if not normalized:
            return False

        upper_value = normalized.upper().strip()
        invalid_placeholders = {
            "WOCO",
            "SIN NÚMERO DE ORDEN",
            "SIN NUMERO DE ORDEN",
            "SIN NÚMERO",
            "SIN NUMERO",
            "SIN ORDEN",
            "ORDEN NO APLICA",
            "SIN ORDEN DE TRABAJO",
            "N/A",
            "NA",
            "NO APLICA",
            "S/N",
            "WOCO N/A",
            "WOCO NA",
            "WOCO S/N",
        }
        if upper_value in invalid_placeholders:
            return False

        if upper_value.startswith("WOCO") and not any(char.isdigit() for char in normalized):
            return False

        if not any(char.isdigit() for char in normalized):
            return False

        return True

    async def list_active(self, user=None):
        return await self.repository.list_active(self._area_ids_for_user(user))

    async def list_dashboard(self, user=None):
        machines = await self.repository.list_active(self._area_ids_for_user(user))
        latest_setups = await self.shift_setup_repository.list_latest_per_machine()
        setup_by_machine = {str(setup.machine_id): setup for setup in latest_setups}

        dashboard = []
        for machine in machines:
            latest_setup = setup_by_machine.get(str(machine.id))
            dashboard.append(self._build_dashboard_payload(machine, latest_setup))

        return dashboard

    def _build_dashboard_payload(self, machine: Machine, latest_setup):
        return {
            "id": machine.id,
            "code": machine.code,
            "name": machine.name,
            "description": machine.description,
            "area_id": machine.area_id,
            "area_name": machine.area.name if machine.area else None,
            "is_active": machine.is_active,
            "created_at": machine.created_at,
            "updated_at": machine.updated_at,
            "current_status": machine.current_status or getattr(latest_setup, "machine_status", None),
            "current_status_description": (
                machine.current_status_description
                if machine.current_status
                else getattr(latest_setup, "machine_status_description", None)
            ),
            "current_order_status": getattr(latest_setup, "order_status", None),
            "current_work_order": getattr(latest_setup, "work_order", None),
            "current_ref_order": getattr(latest_setup, "ref_order", None),
            "last_activity_at": getattr(latest_setup, "updated_at", None) or getattr(latest_setup, "created_at", None),
        }

    async def update_dashboard_status(self, machine_id, payload: MachineDashboardStatusUpdate, user=None):
        """
        Validates if the machine has an open order before allowing a status change.
        """
        machine = await self.repository.get_by_id(machine_id)
        if machine is None:
            raise ValueError("Máquina no encontrada")
        area_ids = self._area_ids_for_user(user)
        if area_ids is not None and machine.area_id not in area_ids:
            raise ValueError("No tienes acceso a esta máquina")

        latest_setup = await self.shift_setup_repository.get_latest_active_by_machine(machine_id)
        if latest_setup is None:
            latest_setup = await self.shift_setup_repository.get_latest_by_machine(machine_id)

        # Only block status changes when there is a real active order in an active shift.
        if (
            latest_setup is not None
            and getattr(latest_setup, "shift", None)
            and latest_setup.shift.status == "active"
            and latest_setup.shift.shift_date == date.today()
        ):
            order_status = (latest_setup.order_status or "").strip().lower()
            has_real_order = (
                self._is_real_order_value(latest_setup.work_order)
                or self._is_real_order_value(latest_setup.ref_order)
            )
            if order_status in {"open", "active", "iniciada"} and has_real_order:
                raise ValueError("Debe cerrar la orden antes de cambiar el estado de la máquina")

        status_description = (
            (payload.machine_status_description or "").strip()
            if payload.machine_status in {"en_mantenimiento", "fuera_de_servicio"}
            else None
        )

        machine.current_status = payload.machine_status
        machine.current_status_description = status_description
        await self.repository.save(machine)

        if latest_setup is not None:
            latest_setup.machine_status = payload.machine_status
            latest_setup.machine_status_description = status_description
            await self.shift_setup_repository.save(latest_setup)

        return self._build_dashboard_payload(machine, latest_setup)

    async def create(self, payload: MachineCreate):
        machine = Machine(
            code=payload.code,
            name=payload.name,
            description=payload.description,
            area_id=payload.area_id,
            is_active=payload.is_active,
        )
        return await self.repository.create(machine)
