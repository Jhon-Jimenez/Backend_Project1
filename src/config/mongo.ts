import mongoose from "mongoose";

const dbConnect = async (): Promise<void> => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/biblioteca";
        await mongoose.connect(mongoUri);
        console.log("✅ Conexión a MongoDB establecida");
    } catch (error) {
        console.error("❌ Error al conectar con MongoDB:", error);
        process.exit(1);
    }
};

export default dbConnect;

