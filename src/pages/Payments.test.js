import {
  isCustomPlanPrice,
  isPlanDisabled,
  runPlanCheckoutFlow,
  transformPlans,
} from "./Payments";
import { runAddonCheckoutFlow } from "./Addon";

jest.mock("../components/ui/tabs", () => ({
  Tabs: () => null,
  TabsList: () => null,
  TabsTrigger: () => null,
}));

jest.mock("@radix-ui/react-tabs", () => ({
  TabsContent: () => null,
}));

jest.mock("../api/plansApi", () => ({
  getPlans: jest.fn(),
  getList: jest.fn(),
  initializeCheckout: jest.fn(),
  verifyCheckout: jest.fn(),
  openPaystackPopup: jest.fn(),
  preloadPaystackInline: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("../api/userApi", () => ({
  getUser: jest.fn(),
}));

const mockT = (key, fallbackOrOptions) => {
  if (typeof fallbackOrOptions === "string") return fallbackOrOptions;
  const map = {
    "payments.features.yes": "Yes",
    "payments.features.no": "No",
    "payments.planCard.targetIndividuals": "For individuals",
    "payments.planCard.targetEnterprise": "For large organizations",
    "payments.planCard.free": "Free",
    "payments.planCard.upgrade": "Upgrade",
    "payments.planCard.customPrice": "Custom",
    "payments.planCard.customFeatures": "Custom features",
    "payments.actions.contactSales": "Contact Sales",
  };
  return map[key] || key;
};

describe("Payments plan transformation helpers", () => {
  it("detects disabled plans accurately", () => {
    expect(isPlanDisabled({ status: "inactive" })).toBe(true);
    expect(isPlanDisabled({ status: "Inactive" })).toBe(true);
    expect(isPlanDisabled({ status: "disabled" })).toBe(true);
    expect(isPlanDisabled({ status: "0" })).toBe(true);
    expect(isPlanDisabled({ status: "active" })).toBe(false);
    expect(isPlanDisabled({})).toBe(false);
  });

  it("detects custom plan pricing accurately", () => {
    expect(isCustomPlanPrice("Custom")).toBe(true);
    expect(isCustomPlanPrice("custom pricing")).toBe(true);
    expect(isCustomPlanPrice("Custom/month")).toBe(true);
    expect(isCustomPlanPrice("20000")).toBe(false);
    expect(isCustomPlanPrice("0")).toBe(false);
  });

  it("filters out inactive plans, preserves plan id, and maps Custom prices to Contact Sales CTA", () => {
    const result = transformPlans(
      {
        plan: [
          {
            id: 2,
            name: "Starter",
            monthly_cost: "7000/month",
            yearly_cost: "70000/year",
            status: "active",
          },
          {
            id: 3,
            name: "Business",
            monthly_cost: "Custom/month",
            yearly_cost: "Custom/year",
            status: "active",
          },
          {
            id: 4,
            name: "Event pro",
            monthly_cost: "100000/month",
            yearly_cost: "1000000/year",
            status: "inactive",
          },
          {
            id: 5,
            name: "Enterprise",
            monthly_cost: "150000/month",
            yearly_cost: "1500000/year",
            status: "inactive",
          },
        ],
      },
      mockT
    );

    expect(result.monthly.map((p) => p.name)).toEqual(["Starter", "Business"]);
    expect(result.yearly.map((p) => p.name)).toEqual(["Starter", "Business"]);

    const starterMonthly = result.monthly.find((p) => p.name === "Starter");
    expect(starterMonthly.id).toBe(2);
    expect(starterMonthly.price).toBe("7000");

    const businessMonthly = result.monthly.find((p) => p.name === "Business");
    expect(businessMonthly.id).toBe(3);
    expect(businessMonthly.price).toBe("Custom");
    expect(businessMonthly.cta).toBe("Contact Sales");
  });
});

describe("Backend-driven checkout and verification flows", () => {
  it("initializes plan checkout on backend, verifies payment on success, and invalidates queries", async () => {
    const initializeCheckoutFn = jest.fn().mockResolvedValue({
      access_code: "ACC_PLAN_123",
      payment_url: "https://checkout.paystack.com/ACC_PLAN_123",
      local_reference: "KNT-PLAN-REF-001",
    });
    const verifyCheckoutFn = jest.fn().mockResolvedValue({
      success: true,
      status: "paid",
      reference: "KNT-PLAN-REF-001",
    });
    const openPaystackPopupFn = jest.fn().mockImplementation(async ({ onSuccess }) => {
      await onSuccess({ reference: "KNT-PLAN-REF-001" });
    });
    const queryClient = {
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
    };
    const toast = jest.fn();

    await runPlanCheckoutFlow({
      plan: { id: 2, name: "Pro", category: "monthly", price: "7000" },
      initializeCheckoutFn,
      openPaystackPopupFn,
      verifyCheckoutFn,
      queryClient,
      toast,
      t: mockT,
    });

    expect(initializeCheckoutFn).toHaveBeenCalledWith({
      item_type: "plan",
      plan_id: 2,
      plan_name: "Pro",
      billing_cycle: "monthly",
      currency: "NGN",
      provider: "paystack",
    });
    expect(openPaystackPopupFn).toHaveBeenCalledWith(
      expect.objectContaining({
        accessCode: "ACC_PLAN_123",
        paymentUrl: "https://checkout.paystack.com/ACC_PLAN_123",
      })
    );
    expect(verifyCheckoutFn).toHaveBeenCalledWith("KNT-PLAN-REF-001");
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["profile-dashboard"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["payments"],
    });
    expect(toast).toHaveBeenCalled();
  });

  it("initializes addon checkout on backend, verifies payment on success, and invalidates queries", async () => {
    const initializeCheckoutFn = jest.fn().mockResolvedValue({
      access_code: "ACC_ADDON_456",
      payment_url: "https://checkout.paystack.com/ACC_ADDON_456",
      local_reference: "KNT-ADDON-REF-002",
    });
    const verifyCheckoutFn = jest.fn().mockResolvedValue({
      success: true,
      status: "paid",
      reference: "KNT-ADDON-REF-002",
    });
    const openPaystackPopupFn = jest.fn().mockImplementation(async ({ onSuccess }) => {
      await onSuccess({ reference: "KNT-ADDON-REF-002" });
    });
    const queryClient = {
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
    };
    const toast = jest.fn();

    await runAddonCheckoutFlow({
      addonId: 5,
      initializeCheckoutFn,
      openPaystackPopupFn,
      verifyCheckoutFn,
      queryClient,
      toast,
      t: mockT,
    });

    expect(initializeCheckoutFn).toHaveBeenCalledWith({
      item_type: "addon",
      addon_id: 5,
      currency: "NGN",
      provider: "paystack",
    });
    expect(verifyCheckoutFn).toHaveBeenCalledWith("KNT-ADDON-REF-002");
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["addons"],
    });
    expect(toast).toHaveBeenCalled();
  });
});
