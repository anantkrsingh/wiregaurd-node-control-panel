import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { listCountries, createCountry, updateCountry } from "../controllers/countries";

const router = Router();

router.get("/", authMiddleware, listCountries);
router.post("/", authMiddleware, createCountry);
router.put("/:id", authMiddleware, updateCountry);

export default router;
