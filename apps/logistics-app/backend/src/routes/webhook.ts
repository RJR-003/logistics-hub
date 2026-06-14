import { Router } from "express";
import { receivePackage } from "../controllers/webhook";

const router = Router();

router.post("/package", receivePackage);

export default router;
