import { Router } from "express";
import {
  createTruck,
  getAllTrucks,
  loadBagOntoTruck,
  delayTruck,
} from "../controllers/trucks";

const router = Router();

router.get("/", getAllTrucks);
router.post("/", createTruck);
router.post("/load-bag", loadBagOntoTruck);
router.post("/delay", delayTruck);

export default router;
