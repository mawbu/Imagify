import React, { useContext, useEffect } from "react";
import { assets, plans } from "../assets/assets";
import { AppContext } from "../context/Appcontext";
// eslint-disable-next-line
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";

const BuyCredit = () => {
  const { user, backendUrl, token, setshowLogin } = useContext(AppContext);
  const location = useLocation();

  useEffect(() => {
    // Kiểm tra nếu URL có status=failed thì hiển thị thông báo lỗi
    const params = new URLSearchParams(location.search);
    if (params.get("status") === "failed") {
      toast.error("Payment was canceled.");
    }
    if (params.get("status") === "success") {
      toast.success("Payment successful!");
    }
  }, [location]);

  const paymentPaypal = async (planId) => {
    try {
      if (!user) {
        setshowLogin(true);
        return;
      }
      console.log("User object:", user);

      const { data } = await axios.post(
        backendUrl + "/api/paypal/payment",
        { userId: user.id, planId },
        { headers: { token } }
      );

      if (data.success && data.approval_url) {
        window.location.href = data.approval_url;
      } else {
        toast.error("Unable to create payment, please try again");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment error!");
    }
  };

  return (
    <motion.div
      className="min-h-[80vh] text-center pt-14 mb-10"
      initial={{ opacity: 0.2, y: 100 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <button className="border border-gray-400 px-10 py-2 rounded-full mb-6">
        Our Plans
      </button>
      <h1 className="text-center text-3xl font-medium mb-6 sm:mb-10">
        Choose the plan
      </h1>
      <div className="flex flex-wrap justify-center gap-6 text-left">
        {plans.map((item, index) => (
          <div
            key={index}
            className="bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500"
          >
            <img width={40} src={assets.logo_icon} alt="" />
            <p className="mt-3 mb-1 font-semibold">{item.id}</p>
            <p className="text-sm">{item.desc}</p>
            <p className="mt-6">
              <span className="text-3xl font-semibold"> ${item.price} </span> /
              {item.credits} credits
            </p>
            <button
              className="w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52"
              onClick={() => paymentPaypal(item.id)}
            >
              {user ? "Purchase" : "Get Started"}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BuyCredit;
