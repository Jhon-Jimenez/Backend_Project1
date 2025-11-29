import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        roles: string[];
    };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            status: "error",
            message: "Token no enviado",
        });
        }

        const token = header.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        roles: string[];
        };

        const user = await UserModel.findById(decoded.id);

        if (!user || !user.enabled) {
        return res.status(401).json({
            status: "error",
            message: "Usuario no autorizado",
        });
        }

        req.user = {
        id: user._id.toString(),
        roles: user.roles,
        };

        next();
    } catch (error) {
        return res.status(401).json({
        status: "error",
        message: "Token inválido",
        });
    }
};
