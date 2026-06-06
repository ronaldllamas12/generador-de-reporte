-- Migration: 0001_add_area_and_shift_setup.sql
-- Purpose: Add `machines.area_id`, shift setup columns and create
-- the `shift_machine_setups` table for existing databases.
-- Run with psql or via your preferred DB migration runner against the
-- application's database.

BEGIN;

-- Add columns to machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS area_id UUID;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS current_status VARCHAR(30);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS current_status_description TEXT;

-- Make sure area_id is nullable (safe for existing rows)
ALTER TABLE machines ALTER COLUMN area_id DROP NOT NULL;

-- Add FK constraint if not present (safe in older Postgres)
DO $$
BEGIN
    ALTER TABLE machines
    ADD CONSTRAINT fk_machines_area_id FOREIGN KEY (area_id) REFERENCES areas(id);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END
$$;

-- Add shift columns used by the new UI
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS machine_status VARCHAR(30);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS order_status VARCHAR(20) DEFAULT 'open';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS machine_status_description TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS work_order VARCHAR(30);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS ref_order VARCHAR(120);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS meters_to_produce VARCHAR(30);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS product_to_laminate VARCHAR(120);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS img_materias_primas JSON DEFAULT '[]';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS img_condiciones_proceso JSON DEFAULT '[]';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS img_temp_secadores JSON DEFAULT '[]';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS img_extraccion_adhesivo JSON DEFAULT '[]';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS img_tiempo_paradas_turno JSON DEFAULT '[]';

-- Events
ALTER TABLE events ADD COLUMN IF NOT EXISTS machine_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_end_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS shift_setup_id UUID;

-- Create the shift_machine_setups table if it's missing
CREATE TABLE IF NOT EXISTS shift_machine_setups (
    id UUID PRIMARY KEY,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    order_status VARCHAR(20) NOT NULL DEFAULT 'open',
    machine_status VARCHAR(30) NOT NULL,
    machine_status_description TEXT,
    work_order VARCHAR(30),
    ref_order VARCHAR(120),
    meters_to_produce VARCHAR(30),
    product_to_laminate VARCHAR(120),
    img_materias_primas JSON DEFAULT '[]',
    img_condiciones_proceso JSON DEFAULT '[]',
    img_temp_secadores JSON DEFAULT '[]',
    img_extraccion_adhesivo JSON DEFAULT '[]',
    img_tiempo_paradas_turno_maquina JSON DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index and auxiliary columns on shift_machine_setups
CREATE INDEX IF NOT EXISTS idx_shift_machine_setups_shift_machine ON shift_machine_setups (shift_id, machine_id, created_at DESC);
ALTER TABLE shift_machine_setups ADD COLUMN IF NOT EXISTS img_tiempo_paradas_turno_maquina JSON DEFAULT '[]';
ALTER TABLE shift_machine_setups ADD COLUMN IF NOT EXISTS order_status VARCHAR(20) DEFAULT 'open';
ALTER TABLE shift_machine_setups ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

COMMIT;

-- NOTE: This migration makes schema changes only. It does not attempt to
-- normalize existing string image columns to JSON arrays. If you need
-- to migrate legacy text columns containing JSON-like values into proper
-- JSON arrays, do that in a separate careful data migration after
-- verifying a backup.
