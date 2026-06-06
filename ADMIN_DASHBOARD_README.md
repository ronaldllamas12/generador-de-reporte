# Dashboard Admin - Guía de Implementación

## ✅ Componentes Implementados

### Backend
1. **Autenticación JWT**
   - `app/core/security.py`: Funciones para hashing de contraseñas (bcrypt) y JWT
   - `app/api/v1/routers/auth.py`: Endpoint de login

2. **Modelos**
   - `app/models/area.py`: Nuevo modelo para áreas de trabajo
   - Existentes: User, Machine, Shift, ShiftMachineSetup, Event

3. **Repositorios**
   - `app/repositories/user_repository.py`: CRUD para usuarios
   - `app/repositories/area_repository.py`: CRUD para áreas
   - Actualizado: `app/repositories/machine_repository.py` con métodos get_by_code, update, delete

4. **Routers Admin**
   - `app/api/v1/routers/admin.py`: Endpoints REST completos para:
     - POST /admin/users - Crear usuario
     - GET /admin/users - Listar usuarios
     - GET /admin/users/{id} - Obtener usuario
     - PUT /admin/users/{id} - Actualizar usuario
     - DELETE /admin/users/{id} - Eliminar usuario
     - POST /admin/machines - Crear máquina
     - GET /admin/machines - Listar máquinas
     - PUT /admin/machines/{id} - Actualizar máquina
     - DELETE /admin/machines/{id} - Eliminar máquina
     - POST /admin/areas - Crear área
     - GET /admin/areas - Listar áreas
     - PUT /admin/areas/{id} - Actualizar área
     - DELETE /admin/areas/{id} - Eliminar área

5. **Actualizado: main.py**
   - Importa los nuevos modelos (Area) y routers (auth, admin)
   - Incluye los nuevos routers en la app
   - Seed data actualizado con contraseñas hasheadas y áreas demo

### Frontend
1. **LoginPage.jsx**
   - Interfaz de login con email/contraseña
   - Almacena token JWT en localStorage
   - Muestra credenciales de demostración

2. **AdminDashboard.jsx**
   - Interfaz con 3 tabs: Usuarios, Máquinas, Áreas
   - Cada tab tiene tabla con CRUD completo
   - Modales para crear/editar registros
   - Botones de eliminar con confirmación

3. **App.jsx**
   - Controla enrutamiento entre Login, Shifts, y Admin
   - Verifica si el usuario está logueado al cargar
   - Solo muestra Admin si user.role === 'admin'
   - Maneja logout y limpieza de tokens

4. **api.js**
   - Interceptor para añadir JWT a cada request
   - Lee token de localStorage y lo envía en header Authorization

## 🚀 Cómo Usar

### 1. Credenciales de Demo
- **Email:** ronald.llamas@example.com
- **Contraseña:** password123
- **Rol:** employee (cambiar a admin manualmente en BD para acceso admin)

### 2. Iniciar Sistema

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 3. Flujo de Uso

1. **Pantalla de Login**
   - Ingresa credenciales
   - Se valida contra BD (con bcrypt)
   - Se genera JWT válido por 8 horas

2. **Dashboard Principal**
   - Si role === 'admin', aparece botón "Admin" en navbar
   - Click en Admin → AdminDashboard

3. **Gestión de Usuarios**
   - Ver lista de todos los usuarios
   - Crear nuevo: Nombre, Email, Contraseña (requerida), Rol, Estado
   - Editar: Nombre, Email, Rol, Estado (sin cambiar contraseña)
   - Eliminar: Con confirmación

4. **Gestión de Máquinas**
   - Ver lista de máquinas
   - Crear: Código (único), Nombre, Descripción, Estado
   - Editar: Todos los campos
   - Eliminar: Con confirmación

5. **Gestión de Áreas**
   - Ver lista de áreas
   - Crear: Nombre (único), Descripción
   - Editar: Todos los campos
   - Eliminar: Con confirmación

## 🔑 Características de Seguridad

1. **Contraseñas**
   - Hasheadas con bcrypt (rounds: 12)
   - Nunca se envían en texto plano
   - Al editar usuario NO se puede cambiar contraseña desde admin

2. **JWT Tokens**
   - Validación en cada request
   - Expiran en 8 horas
   - Incluyen: sub (user_id), email, role

3. **Roles**
   - Los tokens incluyen el role del usuario
   - Se valida en frontend para mostrar/ocultar funciones

## 📊 Seed Data

El sistema crea automáticamente:

**Usuarios:**
- Ronald Llamas (ronald.llamas@example.com)
- María Torres (maria.torres@example.com)
- Carlos Pérez (carlos.perez@example.com)
- Diana Ruiz (diana.ruiz@example.com)

Todos con contraseña: `password123`

**Máquinas:**
- REC-10: Recubridora 10
- REC-11: Recubridora 11
- REC-12: Recubridora 12

**Áreas:**
- Recubrimiento
- Producción
- Empaque
- Mantenimiento

## ⚠️ Notas Importantes

1. **Role Admin**
   - Los usuarios creados por defecto tienen role "employee"
   - Debe actualizar a "admin" manualmente en BD para acceso al dashboard admin
   - O crear nuevo usuario con role "admin" desde el dashboard

2. **Email Único**
   - Cada usuario debe tener email único
   - Cada máquina debe tener código único
   - Cada área debe tener nombre único

3. **Eliminaciones en Cascada**
   - Eliminar máquina NO elimina turnos asociados (protegido)
   - Eliminar usuario NO elimina turnos asociados (protegido)
   - Eliminar área NO afecta máquinas/turnos

4. **Almacenamiento**
   - Token se almacena en localStorage
   - Persiste entre recargas de página
   - Se limpia al cerrar sesión

## 🔧 Siguientes Pasos (Opcionales)

1. **Cambio de Contraseña**
   - Crear endpoint POST /auth/change-password
   - Permitir que el usuario cambie su propia contraseña

2. **Recuperación de Contraseña**
   - Implementar reset link por email

3. **Roles Granulares**
   - Agregar permisos específicos por rol
   - Validar en backend según endpoint

4. **Auditoría**
   - Registrar quien creó/editó/eliminó cada registro
   - Agregar timestamps de acción

5. **Validaciones Adicionales**
   - Email válido (ya parcialmente validado)
   - Contraseña fuerte (min 8 caracteres, requiere mayúscula, número, símbolo)
   - Código de máquina solo caracteres válidos
