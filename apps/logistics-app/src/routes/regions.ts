import { Router } from "express";
import { getAllRegions } from "../controllers/regions";

const router = Router();

router.get("/", getAllRegions);

export default router;
