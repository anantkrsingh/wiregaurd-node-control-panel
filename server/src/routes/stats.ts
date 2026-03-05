import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getPeerStats } from "../controllers/stats";

const router = Router();

router.get("/peers", authMiddleware, getPeerStats);

export default router;
