#!/usr/bin/env python3
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("Starting migration...")

try:
    import psycopg
    print("✓ psycopg imported")
except Exception as e:
    print(f"✗ Failed to import psycopg: {e}")
    sys.exit(1)

try:
    # Connect to the database
    print("Connecting to database...")
    conn = psycopg.connect("postgresql://postgres:postgres@localhost/reportes_db")
    cur = conn.cursor()
    print("✓ Connected")

    print("\nCurrent column types:")
    cur.execute("""
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE column_name LIKE 'img_%' 
    ORDER BY table_name, column_name
    """)

    results = cur.fetchall()
    if not results:
        print("  (No image columns found)")
    else:
        for row in results:
            print(f"  {row[0]}.{row[1]}: {row[2]}")

    print("\n✓ Checking if columns need migration...")
    
    # Only migrate if columns are still VARCHAR
    has_varchar = any(row[2] == 'character varying' for row in results)
    
    if not has_varchar:
        print("  All columns are already JSON type. No migration needed.")
    else:
        print("  Found VARCHAR columns. Migrating to JSON...\n")
        
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

    print("\nVerifying column types:")
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

except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
