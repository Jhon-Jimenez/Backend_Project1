import mongoose, { Schema, Document } from "mongoose";

export interface IUserReserva {
    bookId: mongoose.Types.ObjectId;
    reservadoAt: Date;
    entregaAt?: Date;
}

export interface IUser extends Document {
    nombre: string;
    email: string;
    password: string;
    enabled: boolean;
    roles: string[];
    reservas: IUserReserva[];
}

const ReservaSchema = new Schema<IUserReserva>(
    {
        bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
        reservadoAt: { type: Date, default: () => new Date() },
        entregaAt: { type: Date, required: false },
    },
    { _id: false }
);

const UserSchema = new Schema<IUser>(
    {
        nombre: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        roles: { type: [String], default: ["USER"] },
        reservas: { type: [ReservaSchema], default: [] },
    },
    { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
