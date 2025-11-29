import { Router } from "express";
import userRoutes from "./user.routes";
import bookRoutes from "./book.routes";

const router = Router();

router.use("/users", userRoutes);
router.use("/books", bookRoutes);

export default router;
