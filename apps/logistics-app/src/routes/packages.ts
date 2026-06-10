import { Router } from "express";
import {
  assignToBag,
  updateOutgoingStatus,
  getAllPackages,
} from "../controllers/packages";

const router = Router();

router.get("/", getAllPackages);
router.post("/assign-bag", assignToBag);
router.put("/status", updateOutgoingStatus);

export default router;
