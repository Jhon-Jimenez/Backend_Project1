# 📚 Proyecto Backend – Sistema de Gestión de Biblioteca (Libros y Usuarios)

API RESTful desarrollada con **Node.js**, **Express**, **TypeScript** y **MongoDB**, cumpliendo los lineamientos del proyecto final de la asignatura.  
Permite gestionar **usuarios**, **libros**, **reservas**, autenticación mediante **JWT** y control de permisos.

---

## 📋 Requisitos Previos

- **Node.js** (versión 18 o superior)
- **MongoDB** (instalado localmente o cuenta de MongoDB Atlas)
- **npm** o **yarn**

---

## 🚀 Tecnologías principales

- Node.js  
- Express  
- TypeScript  
- MongoDB + Mongoose  
- JSON Web Tokens (JWT)  
- Jest (para pruebas)
- Middlewares personalizados  
- Arquitectura modular (controllers, routes, middlewares)

---

## 📁 Estructura del Proyecto

```
src/
  config/        # Configuración de MongoDB
  controllers/   # Lógica de usuarios y libros
  middlewares/   # Auth, permisos y validaciones
  models/        # Esquemas de MongoDB
  routes/        # Rutas de la API
  tests/         # Archivos de pruebas
  utils/         # Helpers (paginación)
  server.ts      # Punto de entrada
```

## 🔐 Autenticación

El sistema usa JWT.

## 📚 Endpoints principales

### Usuarios

**Rutas públicas (sin autenticación):**
- `POST /api/v1/users/register` — Registrar usuario
- `POST /api/v1/users/login` — Iniciar sesión

**Rutas protegidas (requieren autenticación):**
- `GET /api/v1/users` — Listar usuarios (con paginación)
- `GET /api/v1/users/:id` — Obtener usuario por ID
- `GET /api/v1/users/:id/reservations` — Historial de reservas del usuario
- `PUT /api/v1/users/:id` — Actualizar usuario (solo el mismo usuario o MODIFY_USERS)
- `DELETE /api/v1/users/:id` — Deshabilitar usuario (solo el mismo usuario o DISABLE_USERS)
- `POST /api/v1/users/:id/disable` — Deshabilitar usuario (alias)

### Libros

**Rutas públicas (sin autenticación):**
- `GET /api/v1/books` — Listar libros (con paginación y filtros)
- `GET /api/v1/books/:id` — Obtener libro por ID

**Rutas protegidas (requieren autenticación):**
- `POST /api/v1/books` — Crear libro (requiere permiso CREATE_BOOKS)
- `PUT /api/v1/books/:id` — Actualizar libro (requiere MODIFY_BOOKS para modificar información)
- `DELETE /api/v1/books/:id` — Deshabilitar libro (requiere permiso DISABLE_BOOKS)
- `POST /api/v1/books/:id/disable` — Deshabilitar libro (alias)
- `POST /api/v1/books/:id/reserve` — Reservar libro (cualquier usuario autenticado)
- `POST /api/v1/books/:id/reservar` — Reservar libro (alias en español)
- `POST /api/v1/books/:id/return` — Entregar libro (cualquier usuario autenticado)
- `POST /api/v1/books/:id/entregar` — Entregar libro (alias en español)
- `GET /api/v1/books/:id/reservations` — Historial de reservas del libro

### Filtros de libros (GET /api/v1/books)

- `categoria` - Filtrar por género/categoría
- `autor` - Filtrar por autor
- `titulo` - Filtrar por nombre/título
- `casaEditorial` - Filtrar por casa editorial
- `fechaPublicacion` - Filtrar por fecha de publicación (formato: YYYY-MM-DD)
- `disponibilidad` - Filtrar por disponibilidad ("disponible" o "reservado")
- `includeDisabled` - Incluir libros deshabilitados ("true" o "false", por defecto "false")
- `page` - Número de página (por defecto: 1)
- `limit` - Libros por página (por defecto: 10)

### Permisos

Los permisos se manejan como roles en el array `roles` del usuario:
- `CREATE_BOOKS` - Crear libros
- `MODIFY_BOOKS` - Modificar información de libros
- `DISABLE_BOOKS` - Deshabilitar libros
- `MODIFY_USERS` - Modificar usuarios
- `DISABLE_USERS` - Deshabilitar usuarios
- `USER` - Usuario básico (puede reservar libros)
- `ADMIN` - Administrador (puede tener combinación de permisos)

## ⚡ Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Backend_Project1
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example`:

```bash
# Copia el archivo de ejemplo
cp .env.example .env
```

O crea manualmente el archivo `.env` con el siguiente contenido:

```env
MONGO_URI=mongodb://localhost:27017/biblioteca
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui_cambiar_en_produccion
PORT=8080
```

** A tener en cuenta:**
- El archivo `.env` está en `.gitignore` y **NO se sube al repositorio**
- Los valores mostrados son **ejemplos/placeholders**, no secretos reales
- Debes cambiar `JWT_SECRET` por un secreto seguro y único para tu proyecto

### 4. Iniciar MongoDB

**Windows:**
```bash
net start MongoDB


```

## 🏃 Ejecución

### Modo desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:8080` (o el puerto configurado en `.env`).

Deberías ver:
```
✅ Conexión a MongoDB establecida
🔥 Conectado a MongoDB
🚀 Servidor corriendo en el puerto 8080
```

### Modo producción

```bash
npm run build
npm start
```

---

## 🧪 Pruebas

### Ejecutar pruebas unitarias

```bash
npm test
```

### Ejecutar pruebas en modo watch

```bash
npm run test:watch
```

Los archivos de prueba se encuentran en `src/tests/` y prueban cada función del controlador en casos exitosos y de fallo.

---

## 📝 Probar los Endpoints

### Autenticación

Todos los endpoints protegidos requieren un token JWT en el header:

```
Authorization: Bearer <tu_token>
```

### Flujo básico de prueba

1. **Registrar un usuario:**
   ```bash
   POST http://localhost:8080/api/v1/users/register
   Body: {
     "nombre": "Juan Pérez",
     "email": "juan@test.com",
     "password": "password123"
   }
   ```

2. **Hacer login:**
   ```bash
   POST http://localhost:8080/api/v1/users/login
   Body: {
     "email": "juan@test.com",
     "password": "password123"
   }
   ```
   **Guarda el token** de la respuesta para usar en los siguientes endpoints.

3. **Crear un libro** (requiere usuario con permiso `CREATE_BOOKS`):
   ```bash
   POST http://localhost:8080/api/v1/books
   Headers: {
     "Authorization": "Bearer <token>"
   }
   Body: {
     "titulo": "El Quijote",
     "autor": "Miguel de Cervantes",
     "descripcion": "Novela clásica",
     "categoria": "Literatura",
     "casaEditorial": "Editorial Real",
     "fechaPublicacion": "1605-01-01",
     "stock": 1
   }
   ```

4. **Listar libros** (sin autenticación):
   ```bash
   GET http://localhost:8080/api/v1/books
   ```

5. **Reservar un libro:**
   ```bash
   POST http://localhost:8080/api/v1/books/{id}/reserve
   Headers: {
     "Authorization": "Bearer <token>"
   }
   ```

### Herramientas recomendadas para probar

- **Postman** - https://www.postman.com/
- **Insomnia** - https://insomnia.rest/
- **Thunder Client** (extensión de VS Code)
- **curl** - desde la terminal

### Ejemplo con curl

```bash
# Registrar usuario
curl -X POST http://localhost:8080/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan","email":"juan@test.com","password":"123456"}'

# Login
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@test.com","password":"123456"}'

# Listar libros (sin token)
curl http://localhost:8080/api/v1/books

# Obtener usuario (con token)
curl http://localhost:8080/api/v1/users/{id} \
  -H "Authorization: Bearer <token>"
```

---

## 🔑 Permisos y Roles

Para crear usuarios con permisos específicos, puedes actualizar el campo `roles` en MongoDB:

```javascript
// Ejemplo: Usuario con permisos para crear libros
{
  "roles": ["USER", "CREATE_BOOKS"]
}

// Ejemplo: Administrador con todos los permisos
{
  "roles": ["USER", "CREATE_BOOKS", "MODIFY_BOOKS", "DISABLE_BOOKS", "MODIFY_USERS", "DISABLE_USERS", "ADMIN"]
}
```

---

## 📊 Ejemplos de Respuestas

### Respuesta exitosa

```json
{
  "status": "success",
  "message": "Operación exitosa",
  "resultado": { ... }
}
```

### Respuesta de error

```json
{
  "status": "error",
  "message": "Descripción del error"
}
```

---

## 📄 Proyecto

Gracias por revisar este proyecto académico.