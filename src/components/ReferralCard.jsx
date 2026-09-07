import React from "react";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useToast } from "../hooks/use-toast";
import {
  getReferralCodeFromRecord,
  getReferralLinkFromRecord,
} from "../lib/referral";

const ReferralCard = ({ user, className = "" }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const referralCode = getReferralCodeFromRecord(user);
  const referralLink = getReferralLinkFromRecord(user);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      description: t("profile.toasts.copied", "Copied to clipboard"),
    });
  };

  return (
    <Card className={`min-w-0 rounded-2xl border-border/60 bg-surface ${className}`}>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold text-foreground">
            {t("profile.info.referralCode", "Referral Code")}
          </h3>
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate rounded-md bg-black/[0.04] px-2 py-1 font-mono text-sm">
              {referralCode || "N/A"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg"
              onClick={() => handleCopy(referralCode)}
              disabled={!referralCode}
              aria-label={t(
                "profile.actions.copyReferralCode",
                "Copy referral code"
              )}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            {t("profile.info.referralLink", "Referral Link")}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <input
              type="text"
              value={referralLink || ""}
              readOnly
              placeholder="Not available"
              className="min-w-0 flex-1 cursor-pointer truncate rounded-lg border border-border/60 bg-black/[0.02] px-3 py-2 text-sm text-muted-foreground"
              onClick={(event) => event.target.select()}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-lg"
              onClick={() => handleCopy(referralLink)}
              disabled={!referralLink}
              aria-label={t(
                "profile.actions.copyReferralLink",
                "Copy referral link"
              )}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
