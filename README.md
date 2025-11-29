# 📚 Proyecto Backend – Sistema de Gestión de Biblioteca (Libros y Usuarios)

API RESTful desarrollada con **Node.js**, **Express**, **TypeScript** y **MongoDB**, cumpliendo los lineamientos del proyecto final de la asignatura.  
Permite gestionar **usuarios**, **libros**, **reservas**, autenticación mediante **JWT** y control de permisos.

---

## 🚀 Tecnologías principales

- Node.js  
- Express  
- TypeScript  
- MongoDB + Mongoose  
- JSON Web Tokens (JWT)  
- Middlewares personalizados  
- Arquitectura modular (controllers, routes, middlewares)

---

## 📁 Estructura del Proyecto

src/
  controllers/   # Lógica de usuarios y libros
  middlewares/   # Auth, permisos y validaciones
  models/        # Esquemas de MongoDB
  routes/        # Rutas de la API
  utils/         # Helpers (paginación)
  server.ts      # Punto de entrada

## 🔐 Autenticación

El sistema usa JWT.

## 📚 Endpoints principales

Usuarios

- POST /api/users/register — Registrar usuario
- POST /api/users/login — Iniciar sesión
- GET /api/users — Listar usuarios (con paginación)
- PUT /api/users/:id/disable — Deshabilitar usuario

Libros

- POST /api/books — Crear libro
- GET /api/books — Listar libros (con paginación)
- PUT /api/books/:id/reserve — Reservar libro
- PUT /api/books/:id/return — Entregar libro

## ⚡ Ejecución

Instalar dependencias: 

npm install

Modo desarrollo:

npm run dev

Build:

npm run build
npm start