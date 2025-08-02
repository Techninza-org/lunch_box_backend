import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Delivery list" });
});

export default router;
