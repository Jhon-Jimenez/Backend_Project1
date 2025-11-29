import { Request, Response, NextFunction } from "express";

export default function enableMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
    ) {
    if (!req.user) {
        return res.status(401).json({
        message: "No autenticado",
        });
    }

    if (req.user.enabled === false) {
        return res.status(403).json({
        message: "Usuario deshabilitado",
        });
    }

    next();
}
