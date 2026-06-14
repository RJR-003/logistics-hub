import { Router } from "express";
import {
  createTruck,
  getAllTrucks,
  loadBagOntoTruck,
  delayTruck,
  departTruck,
  arriveTruck,
} from "../controllers/trucks";

const router = Router();

router.get("/", getAllTrucks);
router.post("/", createTruck);
router.post("/load-bag", loadBagOntoTruck);
router.post("/delay", delayTruck);
router.post("/depart", departTruck);
router.post("/arrive", arriveTruck);

export default router;
