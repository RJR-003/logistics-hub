import { Router } from "express";
import { createBag, delayBag, getAllBags } from "../controllers/bags";

const router = Router();

router.get("/", getAllBags);
router.post("/", createBag);
router.post("/delay", delayBag);

export default router;
