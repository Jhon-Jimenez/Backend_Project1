import mongoose, { Schema, Document } from "mongoose";

export interface IBookReserva {
    userId?: mongoose.Types.ObjectId;      // opcional: tipo usado si guardas id de usuario
    nombreReserva?: string;               // opcional: nombre de quien reservó
    reservadoAt: Date;
    entregaAt?: Date;
}

export interface IBook extends Document {
    titulo: string;
    autor: string;
    descripcion: string;
    categoria: string;
    stock: number;
    enabled?: boolean;
    reservas: IBookReserva[];
}

const ReservaSchema = new Schema<IBookReserva>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
        nombreReserva: { type: String, required: false },
        reservadoAt: { type: Date, default: () => new Date() },
        entregaAt: { type: Date, required: false },
    },
    { _id: false }
);

const BookSchema = new Schema<IBook>(
    {
        titulo: { type: String, required: true },
        autor: { type: String, required: true },
        descripcion: { type: String, default: "" },
        categoria: { type: String, default: "General" },
        stock: { type: Number, required: true },
        enabled: { type: Boolean, default: true },
        reservas: { type: [ReservaSchema], default: [] },
    },
    { timestamps: true }
);

const BookModel = mongoose.model<IBook>("Book", BookSchema);
export default BookModel;
