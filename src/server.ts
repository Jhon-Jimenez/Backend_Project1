import express from "express";
import cors from "cors";
import indexRoutes from "./routes/index.routes";
import dbConnect from "./config/mongo";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1", indexRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada" });
});

dbConnect().then(() => {
    console.log("🔥 Conectado a MongoDB");
});

app.listen(8080, () => {
    console.log("🚀 Servidor corriendo en el puerto 8080");
});
