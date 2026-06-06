Migration files for manual application against the project's PostgreSQL database.

Usage
-----

1. Ensure you have a backup of the database before running migrations.

2. Apply the SQL migration with psql (example):

```bash
# on Windows (PowerShell)
psql "$env:DATABASE_URL" -f backend/migrations/0001_add_area_and_shift_setup.sql

# or using psql with connection string
psql postgresql://user:pass@host:5432/dbname -f backend/migrations/0001_add_area_and_shift_setup.sql
```

3. Alternatively, run the SQL via a DB client or include it in your CI/CD deployment step.

Notes
-----
- These migrations are a minimal manual replacement for the previous
  runtime DDL patching that used to run at application startup.
- For a reproducible, versioned migration workflow consider switching to
  Alembic and translating these SQL files into Alembic revision scripts.
