import "dotenv/config";
import express from "express";
import cors from "cors";
import indexRoutes from "./routes/index.routes";
import dbConnect from "./config/mongo";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1", indexRoutes);

app.use((req, res) => {
    res.status(404).json({ 
        status: "error",
        message: "Ruta no encontrada" 
    });
});

const PORT = process.env.PORT || 8080;

dbConnect().then(() => {
    console.log("🔥 Conectado a MongoDB");
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });
}).catch((error) => {
    console.error("❌ Error al iniciar la aplicación:", error);
    process.exit(1);
});
