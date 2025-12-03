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
 * Un usuario solo puede ser modificado por el mismo, o por un usuario con permiso de modificar usuarios
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        const updates = { ...req.body };

        // Verificar permisos: solo el mismo usuario o un usuario con permiso MODIFY_USERS puede modificar
        const puedeModificar = id === userId || req.user?.roles.includes("MODIFY_USERS");

        if (!puedeModificar) {
            return res.status(403).json({ status: "error", message: "No tienes permisos para modificar este usuario" });
        }

        // no permitir cambiar password aquí directamente
        if (updates.password) delete updates.password;
        // No permitir cambiar roles a menos que sea admin con permisos
        if (updates.roles && !req.user?.roles.includes("MODIFY_USERS")) {
            delete updates.roles;
        }

        const user = await UserModel.findByIdAndUpdate(id, updates, { new: true }).select("-password");
        if (!user || !user.enabled) {
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
        const userId = req.user?.id;

        // Solo el mismo usuario o un usuario con permiso DISABLE_USERS puede deshabilitar
        if (id !== userId && !req.user?.roles.includes("DISABLE_USERS")) {
            return res.status(403).json({ status: "error", message: "No tienes permisos para deshabilitar este usuario" });
        }

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

/**
 * Deshabilitar usuario (alias para deleteUser)
 */
export const disableUser = deleteUser;

/**
 * Obtener usuario por ID (alias para getUser)
 */
export const getUserById = getUser;

/**
 * Listar usuarios con paginación
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const {
            page = "1",
            limit = "10",
            includeDisabled = "false"
        } = req.query as Record<string, string>;

        const filter: any = {};
        if (includeDisabled !== "true") filter.enabled = true;

        const pageN = Math.max(1, Number(page));
        const perPage = Math.max(1, Number(limit));
        const skip = (pageN - 1) * perPage;

        const total = await UserModel.countDocuments(filter);
        const docs = await UserModel.find(filter).select("-password").skip(skip).limit(perPage);

        return res.json({
            status: "success",
            message: "Lista de usuarios",
            resultado: {
                data: docs,
                meta: {
                    page: pageN,
                    perPage,
                    total,
                    totalPages: Math.ceil(total / perPage)
                }
            }
        });
    } catch (err) {
        console.error("getUsers error:", err);
        return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Obtener historial de reservas de un usuario
 */
export const getUserReservations = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;

        // Solo el mismo usuario o un admin puede ver el historial
        if (id !== userId && !req.user?.roles.includes("ADMIN")) {
            return res.status(403).json({ status: "error", message: "No tienes permisos para ver este historial" });
        }

        const user = await UserModel.findById(id).populate("reservas.bookId", "titulo autor");
        if (!user || !user.enabled) {
            return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
        }

        const historial = user.reservas.map(reserva => ({
            libro: {
                id: reserva.bookId,
                titulo: (reserva.bookId as any)?.titulo || "Libro eliminado",
                autor: (reserva.bookId as any)?.autor || "N/A"
            },
            fechaReserva: reserva.reservadoAt,
            fechaEntrega: reserva.entregaAt || null
        }));

        return res.json({
            status: "success",
            message: "Historial de reservas",
            resultado: historial
        });
    } catch (err) {
        console.error("getUserReservations error:", err);
        return res.status(500).json({ status: "error", message: "Error interno" });
    }
};
