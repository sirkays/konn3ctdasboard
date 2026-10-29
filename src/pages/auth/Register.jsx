import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import useAuth from "../../hooks/useAuth";
import { ArrowRight, Eye, EyeOff, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import SideDetail from "./SideDetail";
import logo from "../../assets/konn3ct_logo.png";
import facebook from "../../assets/icons/facebook.svg";
import google from "../../assets/icons/google.svg";
import apple from "../../assets/icons/apple.svg";
import { Separator } from "../../components/ui/separator";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import { useGoogleLogin } from "@react-oauth/google";
import useFacebookSDK from "../../hooks/useFacebookSDK";
import useAppleSDK from "../../hooks/useAppleSDK";
import AppleLogin from "react-apple-login";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  validatePhoneNumberLength,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import {
  clearStoredReferralCode,
  getReferralCodeFromSearchParams,
  getStoredReferralCode,
  normalizeReferralCode,
  setStoredReferralCode,
} from "../../lib/referral";
import {
  googleUserInfoUrl,
} from "../../lib/externalLinks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../components/ui/select";
import { privacyPolicyUrl } from "../../lib/externalLinks";

const regionNames =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

const getCountryLabel = (countryCode) => {
  const countryName = regionNames?.of(countryCode) || countryCode;
  return `${countryName} (+${getCountryCallingCode(countryCode)})`;
};

const getPhoneValidationMessage = (validationResult, t) => {
  switch (validationResult) {
    case "TOO_SHORT":
      return t("auth.register.validation.phoneTooShort");
    case "TOO_LONG":
      return t("auth.register.validation.phoneTooLong");
    case "INVALID_LENGTH":
      return t("auth.register.validation.phoneInvalidLength");
    default:
      return t("auth.register.validation.phoneInvalid");
  }
};

export default function Register() {
  const { t } = useTranslation();
  useFacebookSDK();

  return (
    <div className="flex min-h-screen overflow-x-clip bg-background text-foreground transition-colors duration-300">
      <main className="flex min-h-screen min-w-0 w-full justify-center px-5 py-10 sm:px-10 lg:w-[52%] lg:px-12">
        <Card className="w-[calc(100vw-2.5rem)] min-w-0 max-w-[560px] self-center border-0 bg-transparent p-0 shadow-none sm:w-full">
          <RegisterForm />
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            {t("auth.termsPrefix")}{" "}
            <a
              href={privacyPolicyUrl}
              className="font-medium text-[#207450] underline underline-offset-2 dark:text-green-300"
              rel="noreferrer"
              target="_blank"
            >
              {t("auth.privacyLinkLabel")}
            </a>
          </p>
        </Card>
      </main>
      <SideDetail variant="auth" className="lg:sticky lg:top-0 lg:h-screen" />
    </div>
  );
}

export function RegisterForm() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = useMemo(
    () => getReferralCodeFromSearchParams(searchParams),
    [searchParams]
  );
  const initialReferralCode = referralCodeFromUrl || getStoredReferralCode();
  const countryOptions = useMemo(
    () =>
      getCountries()
        .map((countryCode) => ({
          value: countryCode,
          label: getCountryLabel(countryCode),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    []
  );
  const selectedCountryExample = getExampleNumber("NG", examples);
  const formSchema = z.object({
    email: z.string().email({ message: t("auth.register.validation.email") }),
    password: z
      .string()
      .min(8, { message: t("auth.register.validation.passwordMin") })
      .regex(/[A-Z]/, {
        message: t("auth.register.validation.passwordUppercase"),
      })
      .regex(/[a-z]/, {
        message: t("auth.register.validation.passwordLowercase"),
      })
      .regex(/[0-9]/, {
        message: t("auth.register.validation.passwordNumber"),
      })
      .regex(/[@$!%*?&]/, {
        message: t("auth.register.validation.passwordSpecialCharacter"),
      }),
    firstname: z
      .string()
      .min(2, { message: t("auth.register.validation.firstNameRequired") })
      .refine((value) => value.trim().length > 0, {
        message: t("auth.register.validation.firstNameWhitespace"),
      }),
    lastname: z
      .string()
      .min(2, { message: t("auth.register.validation.lastNameRequired") })
      .refine((value) => value.trim().length > 0, {
        message: t("auth.register.validation.lastNameWhitespace"),
      }),
    country_code: z.string().min(1, {
      message: t("auth.register.validation.countryRequired"),
    }),
    phone: z.string().transform((value) => value.replace(/\D/g, "")),
    referral_code: z.string().optional(),
  }).superRefine((values, ctx) => {
    const validationResult = validatePhoneNumberLength(
      values.phone,
      values.country_code
    );

    if (validationResult) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: getPhoneValidationMessage(validationResult, t),
        path: ["phone"],
      });
    }
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      firstname: "",
      lastname: "",
      country_code: "NG",
      phone: "",
      referral_code: initialReferralCode,
    },
  });

  const { register, login_social } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const { ready: appleSdkReady, error: appleSdkError } = useAppleSDK();
  const selectedCountryCode = form.watch("country_code");
  const selectedCountryLabel =
    countryOptions.find((option) => option.value === selectedCountryCode)
      ?.label || t("common.selectCountry");
  const selectedPhoneExample =
    getExampleNumber(selectedCountryCode, examples) || selectedCountryExample;
  const phoneMaxLength = selectedPhoneExample?.nationalNumber?.length;
  const filteredCountryOptions = useMemo(() => {
    const normalizedQuery = countrySearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return countryOptions;
    }

    return countryOptions.filter((country) =>
      country.label.toLowerCase().includes(normalizedQuery)
    );
  }, [countryOptions, countrySearch]);

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (res) => {
      if (res.success) {
        clearStoredReferralCode();
        toast({ title: t("auth.register.successTitle"), description: res.message });
        navigate("/");
      } else {
        toast({
          title: t("auth.register.errorTitle"),
          description: res.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: t("auth.register.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const socialLoginMutation = useMutation({
    mutationFn: login_social,
    onSuccess: (res) => {
      if (res.success) {
        clearStoredReferralCode();
        toast({
          title: t("auth.register.loginSuccessTitle"),
          description: res.message,
        });
        navigate("/");
      } else {
        toast({
          title: t("auth.register.loginErrorTitle"),
          description: res.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: t("auth.register.loginErrorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (referralCodeFromUrl) {
      setStoredReferralCode(referralCodeFromUrl);
    }

    const nextReferralCode = referralCodeFromUrl || getStoredReferralCode();

    if (nextReferralCode !== form.getValues("referral_code")) {
      form.setValue("referral_code", nextReferralCode, { shouldDirty: false });
    }
  }, [form, referralCodeFromUrl]);

  const getReferralPayload = (value = form.getValues("referral_code")) => {
    const referralCode = normalizeReferralCode(value);

    if (!referralCode) return {};

    return {
      referral: referralCode,
      ref: referralCode,
    };
  };

  async function onSubmit(values) {
    const { referral_code, country_code, phone, ...restValues } = values;
    const normalizedReferralCode = normalizeReferralCode(referral_code);
    const referralPayload = getReferralPayload(referral_code);
    const normalizedPhone = `+${getCountryCallingCode(country_code)}${phone}`;

    if (normalizedReferralCode) {
      setStoredReferralCode(normalizedReferralCode);
    } else {
      clearStoredReferralCode();
    }

    registerMutation.mutate({
      ...restValues,
      phone: normalizedPhone,
      ...referralPayload,
    });
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google Login Success:", tokenResponse);

      try {
        if (!googleUserInfoUrl) {
          toast({
            title: t("auth.register.loginErrorTitle"),
            description: t("auth.register.googleUserInfoMissing"),
            variant: "destructive",
          });
          return;
        }

        const userInfoResponse = await axios.get(googleUserInfoUrl, {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });

        console.log("User Info:", userInfoResponse.data);

        socialLoginMutation.mutate({
          provider: "google",
          accessstoken: tokenResponse.access_token,
          email: userInfoResponse.data.email,
          name: userInfoResponse.data.name,
          id: userInfoResponse.sub,
          avatar: userInfoResponse.data.picture,
          ...getReferralPayload(),
        });
      } catch (error) {
        console.error(
          "Error fetching user info or sending to backend:",
          error
        );
      }
    },
    onError: (error) => console.log(error),
  });

  const isAppleConfigured = Boolean(process.env.REACT_APP_APPLE_CLIENT_ID);

  const handleFacebookLogin = () => {
    if (!process.env.REACT_APP_FACEBOOK_APP_ID) {
      toast({
        title: t("auth.login.facebookFailedTitle", "Facebook Sign-In"),
        description: t("auth.register.facebookUnavailable", "Facebook Sign-In is not configured."),
        variant: "destructive",
      });
      return;
    }

    if (!window.FB) {
      console.error("FB SDK not loaded");
      toast({
        title: t("auth.login.facebookFailedTitle", "Facebook Sign-In"),
        description: t("auth.register.facebookLoading", "Facebook SDK is still loading."),
        variant: "destructive",
      });
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse) {
          const { accessToken } = response.authResponse;

          window.FB.api(
            "/me",
            { fields: "id,name,email,picture" },
            (profile) => {
              console.log("Facebook profile:", profile);

              socialLoginMutation.mutate({
                provider: "facebook",
                accessstoken: accessToken,
                email: profile.email,
                name: profile.name,
                facebookId: profile.id,
                avatar: profile.picture?.data?.url,
                ...getReferralPayload(),
              });
            }
          );
        } else {
          console.log("Facebook login cancelled/failed", response);
        }
      },
      { scope: "email,public_profile" }
    );
  };

  const handleAppleUnavailable = () => {
    toast({
      title: t("auth.login.appleFailedTitle"),
      description: !isAppleConfigured
        ? t("auth.register.appleUnavailable", "Apple Sign-In is not configured.")
        : appleSdkError
        ? t("auth.register.appleUnavailable")
        : t("auth.register.appleLoading"),
      variant: "destructive",
    });
  };

  return (
    <div>
      <div className="mb-8">
        <img src={logo} alt="konn3ct" className="h-10 w-auto object-contain" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start connecting with your team in minutes
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
          onClick={handleFacebookLogin}
        >
          <img className="h-5 w-5" src={facebook} alt="" />
          <span>{t("common.facebook")}</span>
        </button>

        <button
          type="button"
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
          onClick={() => handleGoogleLogin()}
        >
          <img className="h-5 w-5" src={google} alt="" />
          <span>{t("common.google")}</span>
        </button>

        {appleSdkReady && isAppleConfigured ? (
          <AppleLogin
            clientId={process.env.REACT_APP_APPLE_CLIENT_ID}
            redirectURI={process.env.REACT_APP_APPLE_REDIRECT_URI}
            responseType="code"
            responseMode="query"
            usePopup={true}
            render={(renderProps) => (
              <button
                type="button"
                onClick={renderProps.onClick}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
              >
                <img className="h-5 w-5 object-contain dark:invert" src={apple} alt="" />
                <span>{t("common.apple")}</span>
              </button>
            )}
            callback={(res) => {
              console.log("Apple response:", res);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={handleAppleUnavailable}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold text-foreground opacity-60"
          >
            <img className="h-5 w-5 object-contain dark:invert" src={apple} alt="" />
            <span>{t("common.apple")}</span>
          </button>
        )}
      </div>

      <div className="my-7 flex items-center justify-center">
        <Separator className="flex-1 bg-border" />
        <p className="mx-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("common.or")}
        </p>
        <Separator className="flex-1 bg-border" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {t("auth.register.emailLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("auth.register.emailPlaceholder")}
                    className="h-12 w-full rounded-xl border-border bg-muted/30 px-4 text-foreground shadow-none focus-visible:ring-[#207450]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {t("common.password")}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.register.passwordPlaceholder")}
                      className="h-12 w-full rounded-xl border-border bg-muted/30 px-4 pr-12 text-foreground shadow-none focus-visible:ring-[#207450]"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="firstname"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {t("auth.register.firstName")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth.register.firstNamePlaceholder")}
                    className="h-12 w-full rounded-xl border-border bg-muted/30 px-4 text-foreground shadow-none focus-visible:ring-[#207450]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastname"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {t("auth.register.lastName")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth.register.lastNamePlaceholder")}
                    className="h-12 w-full rounded-xl border-border bg-muted/30 px-4 text-foreground shadow-none focus-visible:ring-[#207450]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {t("auth.register.phone")}
                </FormLabel>
                <div className="flex gap-3">
                  <FormControl>
                    <div className="w-[140px] shrink-0">
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("phone", "");
                          }}
                        >
                        <SelectTrigger className="h-12 rounded-xl border-border bg-muted/30 shadow-none">
                          <span className="truncate text-foreground">
                            {selectedCountryLabel}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="left-0 w-[280px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl p-0">
                          <div
                            className="border-b border-border p-3"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex items-center rounded-xl border border-input bg-background px-3">
                              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <Input
                                value={countrySearch}
                                onChange={(event) =>
                                  setCountrySearch(event.target.value)
                                }
                                placeholder={t("common.searchCountryOrCode")}
                                className="border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {filteredCountryOptions.length > 0 ? (
                              filteredCountryOptions.map((countryCode) => (
                                <SelectItem
                                  key={countryCode.value}
                                  value={countryCode.value}
                                  className="whitespace-normal rounded-xl px-3 py-2.5"
                                >
                                  {countryCode.label}
                                </SelectItem>
                              ))
                            ) : (
                              <p className="px-3 py-4 text-sm text-muted-foreground">
                                {t("common.noCountryMatches")}
                              </p>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  </FormControl>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field: phoneField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder={
                              selectedPhoneExample?.nationalNumber ||
                              "8166390205"
                            }
                            className="h-12 w-full rounded-xl border-border bg-muted/30 px-4 text-foreground shadow-none focus-visible:ring-[#207450]"
                            {...phoneField}
                            onChange={(event) => {
                              const digitsOnly = event.target.value
                                .replace(/\D/g, "")
                                .slice(0, phoneMaxLength);
                              phoneField.onChange(digitsOnly);
                            }}
                            maxLength={phoneMaxLength}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referral_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {t("auth.register.referralCode")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth.register.referralCodePlaceholder")}
                    className="h-12 w-full rounded-xl border-border bg-muted/30 px-4 text-foreground shadow-none focus-visible:ring-[#207450]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="main-action-button h-12 w-full rounded-xl text-base font-semibold"
            disabled={registerMutation.isPending}
          >
            {t("auth.register.submit")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </Form>

      <div className="mt-7 flex justify-center gap-x-1.5 text-sm text-muted-foreground">
        <p>{t("auth.register.alreadyHaveAccount")}</p>
        <Link to="/login" className="font-semibold text-[#207450] hover:underline dark:text-green-300">
          {t("auth.register.signIn")}
        </Link>
      </div>
    </div>
  );
}
