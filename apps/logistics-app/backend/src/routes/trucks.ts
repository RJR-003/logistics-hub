import { Router } from "express";
import {
  createTruck,
  getAllTrucks,
  loadBagOntoTruck,
  delayTruck,
  departTruck,
  arriveTruck,
  recoverTruck,
  transferBags,
  resetTruck,
} from "../controllers/trucks";

const router = Router();

router.get("/", getAllTrucks);
router.post("/", createTruck);
router.post("/load-bag", loadBagOntoTruck);
router.post("/delay", delayTruck);
router.post("/depart", departTruck);
router.post("/arrive", arriveTruck);
router.post("/recover", recoverTruck);
router.post("/transfer-bags", transferBags);
router.post("/reset", resetTruck);

export default router;
