import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import transactionModel from "../models/transactionModel.js";
import paypal from "paypal-rest-sdk";

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const allowedDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
    ];

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const isValidDomain = async (email) => {
      const domain = email.split("@")[1];
      if (allowedDomains.includes(domain)) return true;
      try {
        const records = await dns.resolveMx(domain);
        return records.length > 0;
      } catch (error) {
        return false;
      }
    };
    if (!(await isValidDomain(email))) {
      return res.json({ success: false, message: "Invalid email domain" });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token, user: { name: user.name } });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const userCredits = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);
    res.json({
      success: true,
      credits: user.creditBalance,
      user: { id: user._id, name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

const paymentPaypal = async (req, res) => {
  try {
    const { userId, planId } = req.body;
    console.log("Received request:", { userId, planId });

    const userData = await userModel.findById(userId);
    if (!userData || !planId) {
      return res.json({ success: false, message: "Missing Details" });
    }

    let credits, plan, amount;
    switch (planId) {
      case "Basic":
        credits = 100;
        plan = "Basic";
        amount = 10;
        break;
      case "Advanced":
        credits = 500;
        plan = "Advanced";
        amount = 50;
        break;
      case "Business":
        credits = 5000;
        plan = "Business";
        amount = 250;
        break;
      default:
        return res.json({ success: false, message: "Plan not found" });
    }

    console.log("Payment details:", { plan, credits, amount });

    const create_payment_json = {
      intent: "sale",
      payer: { payment_method: "paypal" },
      transactions: [
        {
          amount: { total: amount.toString(), currency: "USD" },
          description: `Purchase ${plan} plan with ${credits} credits`,
        },
      ],
      redirect_urls: {
        return_url: `https://imagify-jbnx.onrender.com/api/paypal/success?userId=${userId}&credits=${credits}`,
        cancel_url: "https://imagify-mabuw.onrender.com/buy?status=failed",
      },
    };

    console.log("Sending request to PayPal:", create_payment_json);

    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        console.error("PayPal error:", error);
        return res.json({
          success: false,
          message: error.response?.message || "Payment creation failed",
          details: error.response || error.message,
        });
      } else {
        console.log("Payment created successfully:", payment);

        await transactionModel.create({
          userId,
          plan,
          credits,
          amount,
          payment: false,
          date: Date.now(),
        });

        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            return res.json({
              success: true,
              approval_url: payment.links[i].href,
            });
          }
        }

        return res.json({ success: false, message: "No approval URL found" });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    res.json({ success: false, message: error.message });
  }
};

const paymentSuccess = async (req, res) => {
  const { paymentId, PayerID, userId, credits } = req.query;
  console.log("Payment success request:", {
    paymentId,
    PayerID,
    userId,
    credits,
  });

  paypal.payment.execute(
    paymentId,
    { payer_id: PayerID },
    async (error, payment) => {
      if (error) {
        console.error("PayPal execution error:", error.response);
        return res.json({
          success: false,
          message: "Payment execution failed",
        });
      } else {
        console.log("Payment executed:", payment);
        const totalAmount = payment.transactions[0].amount.total;
        const user = await userModel.findById(userId);
        if (user) {
          user.creditBalance = (user.creditBalance || 0) + parseInt(credits);
          await user.save();
          console.log("User credits updated:", user.creditBalance);
        }

        await transactionModel.findOneAndUpdate(
          { userId, amount: parseFloat(totalAmount) },
          { payment: true }
        );

        res.redirect("https://imagify-mabuw.onrender.com/buy?status=success");
      }
    }
  );
};
const paymentCancel = (req, res) => {
  res.redirect("https://imagify-mabuw.onrender.com/buy?status=failed");
};

export {
  registerUser,
  loginUser,
  userCredits,
  paymentSuccess,
  paymentCancel,
  paymentPaypal,
};
