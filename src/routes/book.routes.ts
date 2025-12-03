import { Router } from "express";
import {
    createBook,
    getBooks,
    getBookById,
    updateBook,
    disableBook,
    deleteBook,
    reserveBook,
    deliverBook,
    getBookReservations
} from "../controllers/book.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { permitRoles } from "../middlewares/perm.middleware";
import enableMiddleware from "../middlewares/enable.middleware";

const router = Router();

// Rutas públicas (sin autenticación según requisitos)
router.get("/", getBooks);
router.get("/:id", getBookById);

// Rutas protegidas (requieren autenticación)
router.use(authMiddleware);
router.use(enableMiddleware);

// Crear libro - requiere permiso CREATE_BOOKS
router.post("/", permitRoles("CREATE_BOOKS"), createBook);

// Rutas específicas primero (antes de las genéricas con :id)
// Historial de reservas del libro
router.get("/:id/reservations", getBookReservations);

// Reservar un libro - cualquier usuario autenticado puede reservar
router.post("/:id/reserve", reserveBook);
router.post("/:id/reservar", reserveBook); // alias en español

// Entregar libro - cualquier usuario autenticado puede entregar
router.post("/:id/return", deliverBook);
router.post("/:id/entregar", deliverBook); // alias en español

// Deshabilitar libro - requiere permiso DISABLE_BOOKS
router.post("/:id/disable", permitRoles("DISABLE_BOOKS"), disableBook);

// Rutas genéricas al final
// Actualizar libro - requiere permiso MODIFY_BOOKS para modificar información
router.put("/:id", updateBook);

// Deshabilitar libro - requiere permiso DISABLE_BOOKS
router.delete("/:id", permitRoles("DISABLE_BOOKS"), deleteBook);

export default router;
