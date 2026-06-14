import { Router } from "express";
import {
  assignToBag,
  updateOutgoingStatus,
  getAllPackages,
  markForLocalDelivery,
} from "../controllers/packages";

const router = Router();

router.get("/", getAllPackages);
router.post("/assign-bag", assignToBag);
router.put("/status", updateOutgoingStatus);
router.post("/local-delivery", markForLocalDelivery);

export default router;
