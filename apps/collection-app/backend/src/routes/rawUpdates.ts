import { Router } from "express";
import { receiveRawUpdates } from "../controllers/rawUpdates";

const router = Router();

router.post("/", receiveRawUpdates);

export default router;
