import axios from "axios";
import { api } from ".";
import { getToken } from "../services/cookies";

const PAYSTACK_INLINE_SRC = "https://js.paystack.co/v2/inline.js";
let paystackScriptPromise = null;

const getV1EndpointUrl = (path) => {
  const base = String(api.defaults.baseURL || process.env.REACT_APP_BASE_URL || "").replace(/\/+$/, "");
  const root = base.replace(/\/api\/app$/i, "");
  return `${root}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
};

export const getPlans = async () => {
  try {
    const res = await api.get("/pricing-plans");
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const getList = async () => {
  try {
    const res = await api.get("/payments");
    return res.data.data;
  } catch (error) {
    throw error;
  }
};

export const initializeCheckout = async (payload) => {
  try {
    const res = await api.post("/checkout/initialize", payload);
    return res.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      const token = getToken();
      const res = await axios.post(getV1EndpointUrl("/checkout/initialize"), payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return res.data;
    }
    throw error;
  }
};

export const verifyCheckout = async (reference) => {
  const encodedRef = encodeURIComponent(String(reference || "").trim());
  try {
    const res = await api.post(`/checkout/verify/${encodedRef}`, { reference });
    return res.data;
  } catch (error) {
    if (error?.response?.status === 404 && !error?.response?.data?.hasOwnProperty("success")) {
      const token = getToken();
      const res = await axios.post(
        getV1EndpointUrl(`/checkout/verify/${encodedRef}`),
        { reference },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      return res.data;
    }
    throw error;
  }
};

const isPaystackV2Available = () =>
  typeof window !== "undefined" &&
  typeof window.PaystackPop === "function" &&
  typeof window.PaystackPop.prototype?.resumeTransaction === "function";

export const preloadPaystackInline = () => {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (isPaystackV2Available()) {
    return Promise.resolve(window.PaystackPop);
  }
  if (paystackScriptPromise) {
    return paystackScriptPromise;
  }

  paystackScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PAYSTACK_INLINE_SRC}"]`);
    if (existing) {
      if (isPaystackV2Available()) {
        resolve(window.PaystackPop);
        return;
      }
      existing.addEventListener("load", () => resolve(window.PaystackPop));
      existing.addEventListener("error", () => {
        paystackScriptPromise = null;
        reject(new Error("Failed to load Paystack checkout script."));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = PAYSTACK_INLINE_SRC;
    script.async = true;
    script.onload = () => resolve(window.PaystackPop);
    script.onerror = () => {
      paystackScriptPromise = null;
      reject(new Error("Failed to load Paystack checkout script."));
    };
    document.body.appendChild(script);
  });

  return paystackScriptPromise;
};

export const openPaystackPopup = async ({
  accessCode,
  paymentUrl,
  onSuccess,
  onCancel,
  onError,
}) => {
  try {
    const PaystackPop = await preloadPaystackInline();
    if (PaystackPop && accessCode) {
      const popup = new PaystackPop();
      popup.resumeTransaction(accessCode, {
        onSuccess: (transaction) => {
          if (onSuccess) onSuccess(transaction);
        },
        onCancel: () => {
          if (onCancel) onCancel();
        },
        onError: (err) => {
          if (onError) onError(err);
        },
      });
      return;
    }

    if (paymentUrl) {
      window.location.assign(paymentUrl);
      return;
    }

    throw new Error("Unable to initialize payment window.");
  } catch (error) {
    if (paymentUrl) {
      window.location.assign(paymentUrl);
      return;
    }
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
};
