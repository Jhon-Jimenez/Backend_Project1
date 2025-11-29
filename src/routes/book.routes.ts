import { Router } from "express";
import {
    createBook,
    getBooks,
    getBookById,
    updateBook,
    disableBook,
    deleteBook,
    reserveBook,
    deliverBook
} from "../controllers/book.controller";

import authMiddleware from "../middlewares/auth.middleware";
import permMiddleware from "../middlewares/perm.middleware";
import enableMiddleware from "../middlewares/enable.middleware";

const router = Router();

// Aplicar auth y habilitación a todas las rutas
router.use(authMiddleware);
router.use(enableMiddleware);

// *** RUTAS ***

router.post("/", permMiddleware(["ADMIN"]), createBook);
router.get("/", getBooks);
router.get("/:id", getBookById);
router.put("/:id", permMiddleware(["ADMIN"]), updateBook);
router.delete("/:id", permMiddleware(["ADMIN"]), deleteBook);

// Reservar un libro
router.post("/:id/reservar", permMiddleware(["USER", "ADMIN"]), reserveBook);

// Entregar libro
router.post("/:id/entregar", permMiddleware(["USER", "ADMIN"]), deliverBook);

export default router;
