import { Router } from "express";
import { getAllRegions } from "../controllers/region";

const router = Router();
router.get("/", getAllRegions);
export default router;
