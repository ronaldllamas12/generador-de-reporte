#!/usr/bin/env python3
"""
Database migration script to convert VARCHAR image columns to JSON type
"""
import psycopg

def main():
    # Connect to the database
    conn = psycopg.connect("postgresql://postgres:postgres@localhost/reportes_db")
    cur = conn.cursor()

    print("Current column types:")
    cur.execute("""
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE column_name LIKE 'img_%' 
    ORDER BY table_name, column_name
    """)

    for row in cur.fetchall():
        print(f"  {row[0]}.{row[1]}: {row[2]}")

    print("\nMigrating columns to JSON...")

    # Migrate shift_machine_setups columns
    image_cols = [
        'img_materias_primas',
        'img_condiciones_proceso', 
        'img_temp_secadores',
        'img_extraccion_adhesivo',
        'img_tiempo_paradas_turno_maquina'
    ]

    for col in image_cols:
        try:
            cur.execute(f"""
                ALTER TABLE shift_machine_setups 
                ALTER COLUMN {col} TYPE JSON 
                USING CASE 
                    WHEN {col} IS NULL THEN '[]'::json
                    WHEN {col} = '[]' THEN '[]'::json
                    ELSE ('[' || to_json({col}::text) || ']')::json
                END
            """)
            conn.commit()
            print(f"  ✓ shift_machine_setups.{col}")
        except Exception as e:
            conn.rollback()
            print(f"  ✗ shift_machine_setups.{col}: {str(e)[:80]}")

    # Migrate shifts columns  
    shifts_cols = [
        'img_materias_primas',
        'img_condiciones_proceso', 
        'img_temp_secadores',
        'img_extraccion_adhesivo',
        'img_tiempo_paradas_turno'
    ]

    for col in shifts_cols:
        try:
            cur.execute(f"""
                ALTER TABLE shifts 
                ALTER COLUMN {col} TYPE JSON 
                USING CASE 
                    WHEN {col} IS NULL THEN '[]'::json
                    WHEN {col} = '[]' THEN '[]'::json
                    ELSE ('[' || to_json({col}::text) || ']')::json
                END
            """)
            conn.commit()
            print(f"  ✓ shifts.{col}")
        except Exception as e:
            conn.rollback()
            print(f"  ✗ shifts.{col}: {str(e)[:80]}")

    print("\nVerifying new column types:")
    cur.execute("""
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE column_name LIKE 'img_%' 
    ORDER BY table_name, column_name
    """)

    for row in cur.fetchall():
        print(f"  {row[0]}.{row[1]}: {row[2]}")

    cur.close()
    conn.close()
    print("\n✓ Migration complete!")

if __name__ == "__main__":
    main()
