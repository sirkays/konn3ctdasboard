import { CircleCheck, Sparkles } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";
import gradientBackground from "../../assets/login-gradient.png";

const SideDetail = ({ className, variant = "features" }) => {
  const { t } = useTranslation();
  const features = t("auth.sideDetail.features", { returnObjects: true });

  if (variant === "auth") {
    return (
      <aside
        className={cn(
          "relative hidden min-h-screen overflow-hidden bg-cover bg-center p-12 text-white lg:flex lg:w-[48%] lg:flex-col xl:p-16",
          className
        )}
        style={{ backgroundImage: `url("${gradientBackground}")` }}
      >
        <div className="absolute inset-0 bg-[#012e89]/20" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            Secure &amp; Reliable
          </div>

          <div className="mt-auto max-w-xl pb-4">
            <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Connect with your team from anywhere in the world.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg">
              Experience premium video quality, seamless collaboration tools,
              and bank-grade security, all in one platform.
            </p>

            <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
              <p className="text-sm italic leading-6 text-white/85">
                &ldquo;Konn3ct transformed how our team collaborates across 3
                continents. Crystal clear audio, zero lag.&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                  AK
                </div>
                <div>
                  <p className="text-sm font-semibold">Amara Kone</p>
                  <p className="text-xs text-white/65">CTO, TechCorp Africa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div
      className={cn("mb-10 flex flex-1 flex-col gap-y-6 font-medium", className)}
    >
      {(Array.isArray(features) ? features : []).map((message, id) => (
        <div key={id} className="flex gap-x-2 items-center">
          <CircleCheck className="h-[20px] w-[20px]" />
          <p className="text-[#0A2540] dark:text-white">{message}</p>
        </div>
      ))}
    </div>
  );
};

export default SideDetail;
