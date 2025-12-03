import { Request, Response } from "express";
import BookModel from "../models/book.model";
import UserModel from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * Crear libro
 * Requiere permiso CREATE_BOOKS
 */
export const createBook = async (req: AuthRequest, res: Response) => {
    try {
        const { titulo, autor, descripcion, categoria, casaEditorial, fechaPublicacion, stock } = req.body;

        if (!titulo || !autor || !casaEditorial || !fechaPublicacion || typeof stock !== "number") {
            return res.status(400).json({ status: "error", message: "Datos incompletos o inválidos" });
        }

        const book = await BookModel.create({
            titulo,
            autor,
            descripcion: descripcion || "",
            categoria: categoria || "General",
            casaEditorial,
            fechaPublicacion: new Date(fechaPublicacion),
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
 * No requiere autenticación
 */
export const getBook = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const book = await BookModel.findById(id);
        if (!book || !book.enabled) {
            return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        }
        return res.json({ status: "success", message: "Libro encontrado", resultado: book });
    } catch (err) {
        console.error("getBook error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Alias para getBook
 */
export const getBookById = getBook;

/**
 * Obtener lista de libros (filtros + paginación)
 * Retorna solo nombre (titulo) en data, y meta
 * No requiere autenticación
 * Filtros: genero (categoria), fecha de publicación, casa editorial, autor, nombre (titulo), disponibilidad
 */
export const getBooks = async (req: Request, res: Response) => {
    try {
        const {
            page = "1",
            limit = "10",
            categoria, // genero
            autor,
            titulo, // nombre
            casaEditorial,
            fechaPublicacion,
            disponibilidad, // "disponible" o "reservado"
            includeDisabled = "false"
        } = req.query as Record<string, string>;

        const filter: any = {};

        // Por defecto excluir inhabilitados
        if (includeDisabled !== "true") filter.enabled = true;

        // Filtros básicos
        if (categoria) filter.categoria = { $regex: categoria, $options: "i" };
        if (autor) filter.autor = { $regex: autor, $options: "i" };
        if (titulo) filter.titulo = { $regex: titulo, $options: "i" };
        if (casaEditorial) filter.casaEditorial = { $regex: casaEditorial, $options: "i" };

        // Filtro por fecha de publicación
        if (fechaPublicacion) {
            const fecha = new Date(fechaPublicacion);
            if (!isNaN(fecha.getTime())) {
                const inicioDia = new Date(fecha);
                inicioDia.setHours(0, 0, 0, 0);
                const finDia = new Date(fecha);
                finDia.setHours(23, 59, 59, 999);
                filter.fechaPublicacion = { $gte: inicioDia, $lte: finDia };
            }
        }

        const pageN = Math.max(1, Number(page));
        const perPage = Math.max(1, Number(limit));
        const skip = (pageN - 1) * perPage;

        // Construir pipeline de agregación si se requiere filtro de disponibilidad
        let query: any = BookModel.find(filter);
        
        if (disponibilidad) {
            // Usar agregación para filtrar por disponibilidad
            const pipeline: any[] = [{ $match: filter }];
            
            if (disponibilidad === "disponible") {
                pipeline.push({
                    $addFields: {
                        tieneReservasActivas: {
                            $gt: [
                                {
                                    $size: {
                                        $filter: {
                                            input: "$reservas",
                                            cond: { $or: [{ $eq: ["$$this.entregaAt", null] }, { $not: ["$$this.entregaAt"] }] }
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    }
                });
                pipeline.push({ $match: { tieneReservasActivas: false } });
            } else if (disponibilidad === "reservado") {
                pipeline.push({
                    $addFields: {
                        tieneReservasActivas: {
                            $gt: [
                                {
                                    $size: {
                                        $filter: {
                                            input: "$reservas",
                                            cond: { $or: [{ $eq: ["$$this.entregaAt", null] }, { $not: ["$$this.entregaAt"] }] }
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    }
                });
                pipeline.push({ $match: { tieneReservasActivas: true } });
            }
            
            pipeline.push({ $project: { titulo: 1 } });
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: perPage });
            
            const aggregationResult = await BookModel.aggregate(pipeline);
            const totalResult = await BookModel.aggregate([
                ...pipeline.slice(0, -2), // Remover skip y limit para contar total
                { $count: "total" }
            ]);
            
            const total = totalResult[0]?.total || 0;
            const docs = aggregationResult;

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
        }

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
 * Si se modifican campos de información del libro, solo debe permitirse para usuarios con permiso MODIFY_BOOKS
 */
export const updateBook = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const updates = { ...req.body };

        // Campos de información del libro que requieren permiso MODIFY_BOOKS
        const camposInformacion = ["titulo", "autor", "descripcion", "categoria", "casaEditorial", "fechaPublicacion"];
        const modificaInformacion = Object.keys(updates).some(key => camposInformacion.includes(key));

        if (modificaInformacion && !req.user?.roles.includes("MODIFY_BOOKS")) {
            return res.status(403).json({ 
                status: "error", 
                message: "No tienes permisos para modificar la información del libro" 
            });
        }

        const book = await BookModel.findByIdAndUpdate(id, updates, { new: true });
        if (!book || !book.enabled) {
            return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        }
        return res.json({ status: "success", message: "Libro actualizado", resultado: book });
    } catch (err) {
        console.error("updateBook error:", err);
    return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Soft-delete libro
 * Requiere permiso DISABLE_BOOKS
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
 * Deshabilitar libro (alias para deleteBook)
 */
export const disableBook = deleteBook;

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

        // Verificar que el libro esté disponible
        if (!book.enabled) {
            return res.status(400).json({ status: "error", message: "El libro no está disponible" });
        }

        const reservaRegistro = {
            userId: user._id,
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
        if (!book || !book.enabled) return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        if (!user || !user.enabled) return res.status(404).json({ status: "error", message: "Usuario no encontrado" });

        const now = new Date();

        // update last reservation for that user in book
        const bookRes = book.reservas.slice().reverse().find(r => 
            (r.userId && String(r.userId) === String(userId)) || 
            (r.nombreReserva === user.nombre && !r.entregaAt)
        );
        if (bookRes) {
            bookRes.entregaAt = now;
            if (!bookRes.userId) bookRes.userId = user._id;
            if (!bookRes.nombreReserva) bookRes.nombreReserva = user.nombre;
        }

        // update last reservation for that book in user
        const userRes = user.reservas.slice().reverse().find(r => String(r.bookId) === String(book._id) && !r.entregaAt);
        if (userRes) userRes.entregaAt = now;

        await book.save();
        await user.save();

        return res.json({ status: "success", message: "Devolución registrada", resultado: { bookId: book._id } });
    } catch (err) {
        console.error("returnBook error:", err);
        return res.status(500).json({ status: "error", message: "Error interno" });
    }
};

/**
 * Alias para returnBook
 */
export const deliverBook = returnBook;

/**
 * Obtener historial de reservas de un libro
 */
export const getBookReservations = async (req: AuthRequest, res: Response) => {
    try {
        const bookId = req.params.id;
        const book = await BookModel.findById(bookId);
        
        if (!book || !book.enabled) {
            return res.status(404).json({ status: "error", message: "Libro no encontrado" });
        }

        const historial = book.reservas.map(reserva => ({
            nombreReserva: reserva.nombreReserva || "Usuario eliminado",
            fechaReserva: reserva.reservadoAt,
            fechaEntrega: reserva.entregaAt || null
        }));

        return res.json({
            status: "success",
            message: "Historial de reservas del libro",
            resultado: historial
        });
    } catch (err) {
        console.error("getBookReservations error:", err);
        return res.status(500).json({ status: "error", message: "Error interno" });
    }
};
