import {
  isCustomPlanPrice,
  isPlanDisabled,
  transformPlans,
} from "./Payments";

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
}));

jest.mock("../api/userApi", () => ({
  getUser: jest.fn(),
}));

jest.mock("react-paystack", () => ({
  PaystackButton: () => null,
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

  it("filters out inactive plans and maps Custom prices to Contact Sales CTA", () => {
    const result = transformPlans(
      {
        plan: [
          {
            name: "Starter",
            monthly_cost: "7000/month",
            yearly_cost: "70000/year",
            status: "active",
          },
          {
            name: "Business",
            monthly_cost: "Custom/month",
            yearly_cost: "Custom/year",
            status: "active",
          },
          {
            name: "Event pro",
            monthly_cost: "100000/month",
            yearly_cost: "1000000/year",
            status: "inactive",
          },
          {
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

    const businessMonthly = result.monthly.find((p) => p.name === "Business");
    expect(businessMonthly.price).toBe("Custom");
    expect(businessMonthly.cta).toBe("Contact Sales");
  });
});
