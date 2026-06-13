import { useEffect, useState } from "react";
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
import { Link, useNavigate } from "react-router-dom";
import SideDetail from "./SideDetail";
import { Card } from "../../components/ui/card";
import logo from "../../assets/konn3ct_logo.png";
import facebook from "../../assets/icons/facebook.svg";
import google from "../../assets/icons/google.svg";
import sso from "../../assets/icons/sso.svg";
import apple from "../../assets/icons/apple.svg";
import { Separator } from "../../components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import { useGoogleLogin } from "@react-oauth/google";
import useFacebookSDK from "../../hooks/useFacebookSDK";
import useAppleSDK from "../../hooks/useAppleSDK";
import AppleLogin from "react-apple-login";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  googleUserInfoUrl,
  privacyPolicyUrl,
} from "../../lib/externalLinks";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { t } = useTranslation();
  useFacebookSDK();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background text-foreground transition-colors duration-300">
      <main className="flex min-h-screen min-w-0 w-full items-center justify-center px-5 py-10 sm:px-10 lg:w-[52%] lg:px-12">
        <Card className="w-[calc(100vw-2.5rem)] min-w-0 max-w-[520px] border-0 bg-transparent p-0 shadow-none sm:w-full">
          <LoginForm />
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
      <SideDetail variant="auth" />
    </div>
  );
}

export function LoginForm() {
  const { t } = useTranslation();
  const formSchema = z.object({
    username: z
      .string()
      .email({ message: t("auth.login.validation.email") }),
    password: z
      .string()
      .min(6, { message: t("auth.login.validation.passwordMin") }),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, login_social } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { ready: appleSdkReady, error: appleSdkError } = useAppleSDK();

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: t("auth.login.successTitle"), description: res.message });
        navigate("/");
      } else {
        toast({
          title: t("auth.login.errorTitle"),
          description: res.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: t("auth.login.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const socialLoginMutation = useMutation({
    mutationFn: login_social,
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: t("auth.login.successTitle"), description: res.message });
        navigate("/");
      } else {
        toast({
          title: t("auth.login.errorTitle"),
          description: res.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: t("auth.login.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  async function onSubmit(values) {
    loginMutation.mutate(values);
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google Login Success:", tokenResponse);

      try {
        if (!googleUserInfoUrl) {
          toast({
            title: t("auth.login.errorTitle"),
            description: t("auth.login.googleUserInfoMissing"),
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

  const handleFacebookLogin = () => {
    if (!window.FB) {
      console.error("FB SDK not loaded");
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

  const handleAppleResponse = (res) => {
    console.log("Apple login response:", res);

    if (res?.authorization?.code) {
      socialLoginMutation.mutate({
        provider: "apple",
        accessstoken: res.authorization.code,
        email: res.user?.email,
        name:
          res.user?.name?.firstName && res.user?.name?.lastName
            ? `${res.user.name.firstName} ${res.user.name.lastName}`
            : "N/A",
      });
    } else {
      toast({
        title: t("auth.login.appleFailedTitle"),
        description: t("auth.login.appleFailedDescription"),
        variant: "destructive",
      });
    }
  };

  const handleAppleUnavailable = () => {
    toast({
      title: t("auth.login.appleFailedTitle"),
      description: appleSdkError
        ? t("auth.login.appleUnavailable")
        : t("auth.login.appleLoading"),
      variant: "destructive",
    });
  };

  return (
    <div>
      <div className="mb-8">
        <img src={logo} alt="konn3ct" className="h-10" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your credentials to access your account
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex h-12 min-w-0 items-center justify-center gap-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
          onClick={handleFacebookLogin}
        >
          <img className="h-5 w-5" src={facebook} alt="" />
          <span>{t("common.facebook")}</span>
        </button>

        <button
          type="button"
          className="flex h-12 min-w-0 items-center justify-center gap-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
          onClick={() => handleGoogleLogin()}
        >
          <img className="h-5 w-5" src={google} alt="" />
          <span>{t("common.google")}</span>
        </button>

        {appleSdkReady ? (
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
                className="flex h-12 min-w-0 items-center justify-center gap-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
              >
                <img className="h-5 w-5 object-contain dark:invert" src={apple} alt="" />
                <span>{t("common.apple")}</span>
              </button>
            )}
            callback={handleAppleResponse}
          />
        ) : (
          <button
            type="button"
            onClick={handleAppleUnavailable}
            className="flex h-12 min-w-0 items-center justify-center gap-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground opacity-60"
          >
            <img className="h-5 w-5 object-contain dark:invert" src={apple} alt="" />
            <span>{t("common.apple")}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            toast({
              title: t("auth.login.ssoFailedTitle"),
              description: t("auth.login.ssoFailedDescription"),
              variant: "destructive",
            })
          }
          className="flex h-12 min-w-0 items-center justify-center gap-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
        >
          <img className="h-5 w-5 grayscale dark:invert" src={sso} alt="" />
          <span>{t("common.sso")}</span>
        </button>
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
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {t("common.emailAddress")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("auth.login.emailPlaceholder")}
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
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <FormLabel className="text-sm font-semibold text-foreground">
                    {t("common.password")}
                  </FormLabel>
                  <Link
                    to="/forgot-password"
                    className="shrink-0 text-sm font-medium text-[#207450] hover:underline dark:text-green-300"
                  >
                    {t("auth.login.forgotPassword")}
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.login.passwordPlaceholder")}
                      className="h-12 w-full rounded-xl border-border bg-muted/30 px-4 pr-12 text-foreground shadow-none focus-visible:ring-[#207450]"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword
                          ? t("auth.login.hidePassword")
                          : t("auth.login.showPassword")
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#207450] text-base font-semibold text-white shadow-lg shadow-[#207450]/20 hover:bg-[#185f41]"
            disabled={loginMutation.isPending}
          >
            {t("auth.login.submit")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </Form>

      <div className="mt-7 flex justify-center gap-x-1.5 text-sm text-muted-foreground">
        <p>{t("auth.login.noAccount")}</p>
        <Link to="/register" className="font-semibold text-[#207450] hover:underline dark:text-green-300">
          {t("auth.login.signUp")}
        </Link>
      </div>
    </div>
  );
}
