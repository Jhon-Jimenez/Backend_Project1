import { Router } from "express";
import {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    updateUser,
    disableUser,
    deleteUser,
    getUserReservations,
} from "../controllers/user.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { permitRoles } from "../middlewares/perm.middleware";
import enableMiddleware from "../middlewares/enable.middleware";

const router = Router();

// Rutas públicas (sin autenticación)
router.post("/register", registerUser);
router.post("/login", loginUser);

// Rutas protegidas (requieren autenticación)
router.use(authMiddleware);
router.use(enableMiddleware);

// Rutas principales
router.get("/", getUsers);

// Rutas específicas primero (antes de las genéricas con :id)
router.get("/:id/reservations", getUserReservations);
router.post("/:id/disable", disableUser);

// Rutas genéricas al final
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
