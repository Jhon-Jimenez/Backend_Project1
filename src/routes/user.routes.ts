import { Router } from "express";
import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    disableUser,
    deleteUser,
} from "../controllers/user.controller";

import authMiddleware from "../middlewares/auth.middleware";
import permMiddleware from "../middlewares/perm.middleware";
import enableMiddleware from "../middlewares/enable.middleware";

const router = Router();

// Simulación de autenticación
router.use(authMiddleware);
router.use(enableMiddleware);

// Rutas principales
router.post("/", permMiddleware(["ADMIN"]), createUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", permMiddleware(["ADMIN"]), updateUser);
router.delete("/:id", permMiddleware(["ADMIN"]), deleteUser);

// Deshabilitar usuario
router.post("/:id/disable", permMiddleware(["ADMIN"]), disableUser);

export default router;
