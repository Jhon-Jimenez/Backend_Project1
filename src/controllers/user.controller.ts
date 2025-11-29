import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";

const JWT_EXPIRES = "8h";

/**
 * Register - crea un nuevo usuario (sin auth)
 */
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ status: "error", message: "Datos incompletos" });
        }

        const exists = await UserModel.findOne({ email });
        if (exists) {
            return res.status(409).json({ status: "error", message: "El email ya está registrado" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = await UserModel.create({
            nombre,
            email,
            password: hashed,
            enabled: true,
            roles: ["USER"],
            reservas: []
        });

        return res.status(201).json({
            status: "success",
            message: "Usuario registrado",
            resultado: { id: user._id, email: user.email, nombre: user.nombre }
        });
    } catch (err) {
        console.error("registerUser error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Login - devuelve JWT
 */
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: "error", message: "Faltan credenciales" });
        }

        const user = await UserModel.findOne({ email });
        if (!user || !user.enabled) {
            return res.status(401).json({ status: "error", message: "Credenciales inválidas" });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ status: "error", message: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { id: user._id.toString(), roles: user.roles },
            process.env.JWT_SECRET as string,
            { expiresIn: JWT_EXPIRES }
        );

        return res.json({ status: "success", message: "Login exitoso", resultado: { token } });
    } catch (err) {
        console.error("loginUser error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Get user (protected)
 */
export const getUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const user = await UserModel.findById(id).select("-password");
        if (!user || !user.enabled) {
            return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
        }
        return res.json({ status: "success", message: "Usuario encontrado", resultado: user });
    } catch (err) {
        console.error("getUser error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Update user (protected) - solo campos permitidos
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const updates = { ...req.body };

        // no permitir cambiar password aquí directamente (si quieres, crear endpoint dedicado)
        if (updates.password) delete updates.password;

        const user = await UserModel.findByIdAndUpdate(id, updates, { new: true }).select("-password");
        if (!user) {
            return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
        }

        return res.json({ status: "success", message: "Usuario actualizado", resultado: user });
    } catch (err) {
        console.error("updateUser error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Soft-delete (deshabilitar) usuario (protected)
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const user = await UserModel.findByIdAndUpdate(id, { enabled: false }, { new: true }).select("-password");
        if (!user) {
            return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
        }
        return res.json({ status: "success", message: "Usuario deshabilitado", resultado: { id: user._id } });
    } catch (err) {
        console.error("deleteUser error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};
