import { Request, Response } from "express";
import BookModel from "../models/book.model";
import UserModel from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * Crear libro
 */
export const createBook = async (req: AuthRequest, res: Response) => {
    try {
        const { titulo, autor, descripcion, categoria, stock } = req.body;

        if (!titulo || !autor || typeof stock !== "number") {
            return res.status(400).json({ status: "error", message: "Datos incompletos o inválidos" });
        }

        const book = await BookModel.create({
            titulo,
            autor,
            descripcion: descripcion || "",
            categoria: categoria || "General",
            stock,
            reservas: []
        });

        return res.status(201).json({ status: "success", message: "Libro creado", resultado: book });
    } catch (err) {
        console.error("createBook error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Obtener 1 libro por id
 */
export const getBook = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const book = await BookModel.findById(id);
        if (!book) return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        return res.json({ status: "success", message: "Libro encontrado", resultado: book });
    } catch (err) {
        console.error("getBook error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Obtener lista de libros (filtros + paginación)
 * Retorna solo nombre (titulo) en data, y meta
 */
export const getBooks = async (req: Request, res: Response) => {
    try {
        const {
            page = "1",
            limit = "10",
            categoria,
            autor,
            titulo,
            includeDisabled = "false"
        } = req.query as Record<string, string>;

        const filter: any = {};

        if (includeDisabled !== "true") filter.enabled = true;
        if (categoria) filter.categoria = categoria;
        if (autor) filter.autor = autor;
        if (titulo) filter.titulo = { $regex: titulo, $options: "i" };

        const pageN = Math.max(1, Number(page));
        const perPage = Math.max(1, Number(limit));
        const skip = (pageN - 1) * perPage;

        const total = await BookModel.countDocuments(filter);
        const docs = await BookModel.find(filter).select("titulo").skip(skip).limit(perPage);

        return res.json({
            status: "success",
            message: "Lista de libros",
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
        console.error("getBooks error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Actualizar libro
 */
export const updateBook = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const updates = { ...req.body };
        const book = await BookModel.findByIdAndUpdate(id, updates, { new: true });
        if (!book) return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        return res.json({ status: "success", message: "Libro actualizado", resultado: book });
    } catch (err) {
        console.error("updateBook error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Soft-delete libro
 */
export const deleteBook = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const book = await BookModel.findByIdAndUpdate(id, { enabled: false }, { new: true });
        if (!book) return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        return res.json({ status: "success", message: "Libro deshabilitado", resultado: { id: book._id } });
    } catch (err) {
        console.error("deleteBook error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Reservar libro (agrega entrada tanto en book.reservas como en user.reservas)
 */
export const reserveBook = async (req: AuthRequest, res: Response) => {
    try {
        const bookId = req.params.id;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ status: "error", message: "No autenticado" });

        const book = await BookModel.findById(bookId);
        const user = await UserModel.findById(userId);
        if (!book) return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        if (!user) return res.status(404).json({ status: "error", message: "Usuario no encontrado" });

        const reservaRegistro = {
            nombreReserva: user.nombre,
            reservadoAt: new Date()
        };

        book.reservas.push(reservaRegistro);
        await book.save();

        user.reservas.push({ bookId: book._id, reservadoAt: reservaRegistro.reservadoAt });
        await user.save();

        return res.json({ status: "success", message: "Reserva registrada", resultado: { bookId: book._id } });
    } catch (err) {
        console.error("reserveBook error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Marcar devolución / entrega (set entregaAt en ambos documentos)
 */
export const returnBook = async (req: AuthRequest, res: Response) => {
    try {
        const bookId = req.params.id;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ status: "error", message: "No autenticado" });

        const book = await BookModel.findById(bookId);
        const user = await UserModel.findById(userId);
        if (!book) return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        if (!user) return res.status(404).json({ status: "error", message: "Usuario no encontrado" });

        const now = new Date();

        // update last reservation for that user in book
        const bookRes = book.reservas.slice().reverse().find(r => r.nombreReserva === user.nombre && !("entregaAt" in r));
        if (bookRes) bookRes.entregaAt = now;

        // update last reservation for that book in user
        const userRes = user.reservas.slice().reverse().find(r => String(r.bookId) === String(book._id) && !("entregaAt" in r));
        if (userRes) userRes.entregaAt = now;

        await book.save();
        await user.save();

        return res.json({ status: "success", message: "Devolución registrada", resultado: { bookId: book._id } });
    } catch (err) {
        console.error("returnBook error:", err);
        return res.status(500).json({ status: "error", message: "Error interno" });
    }
};
