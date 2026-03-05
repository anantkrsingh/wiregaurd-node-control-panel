import { Router } from "express";
import { listActiveServers, confRequest } from "../controllers/public";

const router = Router();

/** GET /api/public/servers – list all active servers (SSH + WireGuard), no auth */
router.get("/servers", listActiveServers);

/** POST /api/public/conf-request – create new peer and return config, no auth */
router.post("/conf-request", confRequest);

export default router;
