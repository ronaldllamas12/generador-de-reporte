# Debugging - React Errors

## Errores Reportados

### 1. "Listener indicated an asynchronous response"
**Error:**
```
Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, 
but the message channel closed before a response was received
```

**Causa Probable:** 
- Este error típicamente viene de extensiones de Chrome/navegador que interfieren con message passing
- O un interceptor que nunca se resuelve correctamente

**Soluciones:**
1. **Limpiar Cache del Navegador:**
   - Abre DevTools (F12)
   - Ir a Application → Clear Site Data
   - Recarga la página

2. **Desabilitar Extensiones Temporalmente:**
   - Chrome: Abre `chrome://extensions/`
   - Desactiva extensiones una por una
   - Observa si el error desaparece

3. **Ver Console Details:**
   - Abre DevTools Console
   - El error debe tener stack trace adicional
   - Comparte la línea exacta donde ocurre

### 2. "Encountered two children with the same key"
**Error:**
```
react-dom-client.development.js:6604 Encountered two children with the same key, 
`74bb6c6d-f09a-4a4d-8db9-9e10d7f659e5-undefined`. Keys should be unique so that 
components maintain their identity across updates.
```

**Causa:** 
- El backend no está retornando los campos `id` correctamente
- O los datos tienen valores `undefined`

**Solución Implementada:**
- Actualicé el backend para usar schemas Pydantic (MachineRead, MachineCreate, etc.)
- Ahora usa `.from_orm()` para serializar correctamente los UUIDs
- Frontend filtra datos sin `id` antes de usarlos

**Verificación:**
1. Abre DevTools → Network
2. Haz un login
3. Ve a Admin Dashboard
4. Observa las requests a `/admin/users`, `/admin/machines`, `/admin/areas`
5. Verifica que cada elemento tiene un campo `id` válido (UUID)

## Pasos para Verificar

### En el Backend (Terminal):
```bash
# Verificar que se inició correctamente
# Debería mostrar: "Uvicorn running on http://0.0.0.0:8000"
```

### En el Frontend (DevTools):

**Console Tab:**
```javascript
// Verifica si hay errores específicos
// Busca por "Error loading" que indica problemas en requests
```

**Network Tab:**
1. Filtra por `admin/` 
2. Haz clic en cada request
3. Ve a la pestaña "Response"
4. Verifica que los datos tengan estructura:
```json
[
  {
    "id": "uuid-string",
    "name": "...",
    ...
  }
]
```

### Credenciales Demo (sin rol admin):
- Email: `ronald.llamas@example.com`
- Password: `password123`

## Para Acceso Admin

El sistema requiere `user.role === 'admin'` para mostrar el botón Admin. Los usuarios demo tienen `role: "employee"`.

**Opción 1: Actualizar BD manualmente**
```sql
UPDATE users SET role = 'admin' WHERE email = 'ronald.llamas@example.com';
```

**Opción 2: Crear nuevo usuario con Postman/curl**
```bash
curl -X POST http://localhost:8000/api/v1/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Admin User",
    "email": "admin@example.com",
    "password": "password123",
    "role": "admin",
    "is_active": true
  }'
```

Luego login con ese usuario.

## Checklist de Debugging

- [ ] Backend está corriendo en puerto 8000
- [ ] Frontend está en `http://localhost:5173`
- [ ] Puedo hacer login exitoso
- [ ] DevTools console no muestra errores rojo
- [ ] Network tab muestra responses con `id` válidos
- [ ] No hay extensiones de Chrome interfiriendo
- [ ] Browser cache está limpiado

## Si Persisten los Errores

1. **Screenshot de DevTools Console** - con el error completo
2. **Screenshot de Network Response** - mostrando qué devuelve `/admin/users`
3. **Logs del backend** - cualquier error en terminal uvicorn

Esto ayudará a identificar exactamente dónde está el problema.
