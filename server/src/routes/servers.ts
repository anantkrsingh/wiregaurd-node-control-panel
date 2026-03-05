import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createServer,
  generateClientConfig,
  getServer,
  getServerPublicKey,
  listServers,
  runServerCheck,
  updateServer,
  verifyServer,
  deleteServer,
} from "../controllers/servers";

const router = Router();

router.get("/", authMiddleware, listServers);
router.post("/", authMiddleware, createServer);
router.get("/:id/public-key", authMiddleware, getServerPublicKey);
router.post("/:id/verify", authMiddleware, verifyServer);
router.post("/:id/run-check", authMiddleware, runServerCheck);
router.post("/:id/generate-client-config", authMiddleware, generateClientConfig);
router.get("/:id", authMiddleware, getServer);
router.patch("/:id", authMiddleware, updateServer);
router.delete("/:id", authMiddleware, deleteServer);

export default router;

