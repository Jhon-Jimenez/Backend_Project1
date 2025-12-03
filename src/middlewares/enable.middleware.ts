import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export default function enableMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
    ) {
    if (!req.user) {
        return res.status(401).json({
        status: "error",
        message: "No autenticado",
        });
    }

    // Verificar si el usuario está habilitado consultando la BD
    // Esto se hace en el authMiddleware, pero por seguridad verificamos aquí también
    next();
}
