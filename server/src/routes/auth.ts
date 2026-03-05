import { Router } from "express";
import { createNewUser, createUser, getUser, login, usersPresent } from "../controllers/auth";
import { authMiddleware } from "../middleware/auth";
const  router = Router();

router.get("/users-available", usersPresent);
router.post("/create-new-user", createNewUser);
router.post("/create-user", createUser);
router.post("/login", login);
router.get("/get-user", authMiddleware, getUser);   
export default router;