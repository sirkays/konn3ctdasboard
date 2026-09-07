import React from "react";
import { Check, Crown, Shield } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { DialogClose, DialogDescription, DialogTitle } from "../../../components/ui/dialog";

const features = [
  "Unlimited Team Members",
  "500 Participants per session",
  "Cloud Recording & AI Transcripts",
];

const UpgradeTeam = ({ onUpgrade }) => {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
        <Shield className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
          Team Limit Reached
        </DialogTitle>
        <DialogDescription className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
          The Basic plan includes up to 3 team members. Upgrade to unlock larger
          teams and advanced admin controls.
        </DialogDescription>
      </div>

      <div className="relative rounded-2xl border-2 border-brand-blue bg-brand-blue/5 p-5 text-left">
        <span className="absolute right-0 top-0 rounded-bl-xl rounded-tr-xl bg-brand-blue px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
          Recommended
        </span>

        <div className="flex items-center gap-2 pr-28 text-brand-blue">
          <Crown className="h-5 w-5" />
          <h3 className="text-base font-extrabold">Lite Plan</h3>
        </div>

        <div className="mt-6 flex items-end gap-2">
          <span className="text-4xl font-extrabold leading-none text-foreground">
            ₦66,000
          </span>
          <span className="pb-1 text-sm font-semibold text-muted-foreground">
            / year
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 text-brand-green" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        className="main-action-button h-11 w-full rounded-xl text-sm font-extrabold"
        onClick={onUpgrade}
      >
        Upgrade via Paystack
      </Button>

      <DialogClose asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-9 text-sm font-bold text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          Maybe Later
        </Button>
      </DialogClose>
    </div>
  );
};

export default UpgradeTeam;
