import { Router } from "express";
import { receiveRawUpdates } from "../controllers/rawUpdates";
import { serviceAuth } from "../middleware/serviceAuth";

const router = Router();
// Protected — only logistics app should call this
router.post("/", serviceAuth, receiveRawUpdates);

export default router;
