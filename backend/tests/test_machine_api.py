from datetime import date, timedelta
from uuid import uuid4

import pytest
from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from app.models.shift import Shift
from app.models.shift_machine_setup import ShiftMachineSetup
from app.models.user import User


@pytest.mark.asyncio
async def test_machine_dashboard_returns_machine_with_status(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester", email="tester@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-01", name="Máquina de prueba")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today(),
        )
        session.add(shift)
        await session.commit()
        await session.refresh(shift)

        setup = ShiftMachineSetup(
            shift_id=shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="open",
        )
        session.add(setup)
        await session.commit()
        await session.refresh(setup)

    response = await async_client.get("/api/v1/machines/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(item["id"] == str(machine.id) for item in data)


@pytest.mark.asyncio
async def test_machine_status_update_allows_change_when_no_real_order(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester 2", email="tester2@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-02", name="Máquina sin orden")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today(),
        )
        session.add(shift)
        await session.commit()
        await session.refresh(shift)

        setup = ShiftMachineSetup(
            shift_id=shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="open",
        )
        session.add(setup)
        await session.commit()
        await session.refresh(setup)

    response = await async_client.patch(
        f"/api/v1/machines/{machine.id}/status",
        json={"machine_status": "fuera_de_servicio", "machine_status_description": "Parada sin orden"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_status"] == "fuera_de_servicio"
    assert payload["current_status_description"] == "Parada sin orden"


@pytest.mark.asyncio
async def test_machine_status_update_allows_change_when_order_fields_are_blank(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester 5", email="tester5@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-05", name="Máquina sin orden real")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today(),
        )
        session.add(shift)
        await session.commit()
        await session.refresh(shift)

        setup = ShiftMachineSetup(
            shift_id=shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="open",
            work_order="   ",
            ref_order="",
        )
        session.add(setup)
        await session.commit()
        await session.refresh(setup)

    response = await async_client.patch(
        f"/api/v1/machines/{machine.id}/status",
        json={"machine_status": "fuera_de_servicio", "machine_status_description": "Parada sin orden"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_status"] == "fuera_de_servicio"
    assert payload["current_status_description"] == "Parada sin orden"


@pytest.mark.asyncio
async def test_machine_status_update_allows_change_when_order_fields_are_blank(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester 5", email="tester5@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-05", name="Máquina sin orden real")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today(),
        )
        session.add(shift)
        await session.commit()
        await session.refresh(shift)

        setup = ShiftMachineSetup(
            shift_id=shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="open",
            work_order="   ",
            ref_order="",
        )
        session.add(setup)
        await session.commit()
        await session.refresh(setup)

    response = await async_client.patch(
        f"/api/v1/machines/{machine.id}/status",
        json={"machine_status": "fuera_de_servicio", "machine_status_description": "Parada sin orden"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_status"] == "fuera_de_servicio"
    assert payload["current_status_description"] == "Parada sin orden"


@pytest.mark.asyncio
async def test_machine_status_update_allows_change_when_active_order_status_but_no_real_order(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester 7", email="tester7@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-07", name="Máquina con orden no real")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today(),
        )
        session.add(shift)
        await session.commit()
        await session.refresh(shift)

        setup = ShiftMachineSetup(
            shift_id=shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="active",
            work_order="   ",
            ref_order="",
        )
        session.add(setup)
        await session.commit()
        await session.refresh(setup)

    response = await async_client.patch(
        f"/api/v1/machines/{machine.id}/status",
        json={"machine_status": "fuera_de_servicio", "machine_status_description": "Parada sin orden"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_status"] == "fuera_de_servicio"
    assert payload["current_status_description"] == "Parada sin orden"


@pytest.mark.asyncio
async def test_machine_status_update_allows_change_when_order_is_placeholder(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester 6", email="tester6@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-06", name="Máquina con orden placeholder")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today(),
        )
        session.add(shift)
        await session.commit()
        await session.refresh(shift)

        setup = ShiftMachineSetup(
            shift_id=shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="open",
            work_order="WOCO",
            ref_order="Sin número de orden",
        )
        session.add(setup)
        await session.commit()
        await session.refresh(setup)

    response = await async_client.patch(
        f"/api/v1/machines/{machine.id}/status",
        json={"machine_status": "fuera_de_servicio", "machine_status_description": "Parada sin orden"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_status"] == "fuera_de_servicio"
    assert payload["current_status_description"] == "Parada sin orden"


@pytest.mark.asyncio
async def test_machine_status_update_blocks_when_active_real_order_exists(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester 3", email="tester3@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-03", name="Máquina con orden")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today(),
        )
        session.add(shift)
        await session.commit()
        await session.refresh(shift)

        setup = ShiftMachineSetup(
            shift_id=shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="open",
            work_order="WOCO123",
        )
        session.add(setup)
        await session.commit()
        await session.refresh(setup)

    response = await async_client.patch(
        f"/api/v1/machines/{machine.id}/status",
        json={"machine_status": "fuera_de_servicio", "machine_status_description": "Parada preventiva"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Debe cerrar la orden antes de cambiar el estado de la máquina"


@pytest.mark.asyncio
async def test_machine_status_update_allows_change_when_active_order_is_from_previous_day(async_client):
    async with AsyncSessionLocal() as session:
        user = User(full_name="Tester 4", email="tester4@example.com", hashed_password="password123")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        machine = Machine(code="TEST-04", name="Máquina con orden antigua")
        session.add(machine)
        await session.commit()
        await session.refresh(machine)

        old_shift = Shift(
            user_id=user.id,
            machine_id=machine.id,
            area="Test",
            shift_number=1,
            shift_date=date.today() - timedelta(days=1),
        )
        session.add(old_shift)
        await session.commit()
        await session.refresh(old_shift)

        old_setup = ShiftMachineSetup(
            shift_id=old_shift.id,
            machine_id=machine.id,
            machine_status="en_produccion",
            order_status="open",
            work_order="WOCO999",
        )
        session.add(old_setup)
        await session.commit()
        await session.refresh(old_setup)

    response = await async_client.patch(
        f"/api/v1/machines/{machine.id}/status",
        json={"machine_status": "fuera_de_servicio", "machine_status_description": "Parada preventiva"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_status"] == "fuera_de_servicio"
    assert payload["current_status_description"] == "Parada preventiva"
