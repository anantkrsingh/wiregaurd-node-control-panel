import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { listCountries, createCountry } from "../controllers/countries";

const router = Router();

router.get("/", authMiddleware, listCountries);
router.post("/", authMiddleware, createCountry);

export default router;
