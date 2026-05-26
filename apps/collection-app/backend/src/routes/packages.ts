import { Router } from "express";
import {
  createPackage,
  getAllPackages,
  getPackageByTrackingId,
  getDashboard,
} from "../controllers/packages";

const router = Router();

//dashboard
router.get("/dashboard", getDashboard);

// POST /api/packages — create a new package
router.post("/", createPackage);

// GET /api/packages — get all packages (dashboard)
router.get("/", getAllPackages);

// GET /api/packages/track/:trackingId — public tracking
router.get("/track/:trackingId", getPackageByTrackingId);

export default router;
