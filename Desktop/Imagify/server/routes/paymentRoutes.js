import express from "express";
import {
  paymentPaypal,
  paymentSuccess,
  paymentCancel,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/paypal/payment", paymentPaypal);

export default router;
