import express from "express";
import {
  paymentPaypal,
  paymentSuccess,
  paymentCancel,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/paypal/payment", paymentPaypal);
router.get("/paypal/success", paymentSuccess);

export default router;
