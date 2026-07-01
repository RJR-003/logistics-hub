import { Router } from "express";
import { confirmEtlBatch } from "../controllers/etlConfirm";
import { serviceAuth } from "../middleware/serviceAuth";

const router = Router();
// Protected — only collection app should call this
router.post("/", serviceAuth, confirmEtlBatch);
export default router;
