import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

/**
 * Middleware que verifica si el usuario autenticado posee el/los roles requeridos.
 * @param roles Roles permitidos para acceder a la ruta.
 */
export const permitRoles = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
        if (!req.user) {
            return res.status(401).json({
            status: "error",
            message: "No autenticado",
            });
        }

        const userRoles = req.user.roles;

        if (!Array.isArray(userRoles)) {
            return res.status(500).json({
            status: "error",
            message: "Error interno: roles mal definidos",
            });
        }

        // Verificamos si algún rol del usuario está dentro de los permitidos
        const tienePermiso = userRoles.some((r) => roles.includes(r));

        if (!tienePermiso) {
            return res.status(403).json({
            status: "error",
            message: "No tienes permisos para acceder a esta ruta",
            });
        }

        // Si pasa los permisos → continuar
        next();
        } catch (err) {
        console.error("Error en permitRoles:", err);
        return res.status(500).json({
            status: "error",
            message: "Error interno en permisos",
        });
        }
    };
};
