import { Button } from "@/components/ui/button";
import {
  Download,
  Link,
  Loader2,
  Lock,
  Mic,
  Music,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useCreateCheckoutSession } from "../hooks/useCreateCheckoutSession";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const FEATURES = [
  {
    icon: Waves,
    text: "10 real-time sound channels — beatbox, clicks, pops, breath, sneers & more",
  },
  {
    icon: Music,
    text: "200+ historical instruments mapped to your mouth sounds",
  },
  { icon: RefreshCw, text: "Record, erase & re-record unlimited takes" },
  { icon: Download, text: "Save & download your instrumentals as WAV files" },
  {
    icon: Link,
    text: "Share projects via link — others load the exact same beat",
  },
];

export default function PaywallScreen() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { actor } = useActor();
  const createCheckoutSession = useCreateCheckoutSession();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isLoggedIn = !!identity;

  const stripeActor = actor as any;

  // Stripe not configured yet — admin can bypass
  const needsStripeSetup =
    isLoggedIn &&
    actor &&
    typeof stripeActor.createCheckoutSession !== "function";

  const handleAdminUnlock = () => {
    localStorage.setItem("musicmouth_paid", "true");
    window.location.reload();
  };

  const handleCheckout = async () => {
    setCheckoutError(null);
    try {
      const session = await createCheckoutSession.mutateAsync([
        { name: "Music Mouth Full Access", price: 499, quantity: 1n },
      ]);
      if (!session?.url) throw new Error("Stripe session missing url");
      window.location.href = session.url;
    } catch (err: any) {
      setCheckoutError(
        err?.message ?? "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "oklch(0.08 0.01 240)" }}
    >
      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "oklch(0.22 0.015 240)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "oklch(0.67 0.22 15)",
              boxShadow: "0 0 16px oklch(0.67 0.22 15 / 0.6)",
            }}
          >
            <Mic className="w-4 h-4 text-white" />
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: "oklch(0.96 0.005 240)" }}
          >
            Music{" "}
            <span
              style={{
                color: "oklch(0.67 0.22 15)",
                textShadow: "0 0 20px oklch(0.67 0.22 15 / 0.8)",
              }}
            >
              Mouth
            </span>
          </h1>
        </div>

        {!isLoggedIn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={login}
            disabled={isLoggingIn}
            className="text-sm"
            style={{ color: "oklch(0.79 0.16 192)" }}
            data-ocid="paywall.login.button"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Log In
          </Button>
        )}
      </header>

      {/* Hero banner image */}
      <div className="relative w-full" style={{ height: 280 }}>
        <img
          src="/assets/generated/music-mouth-wallpaper.dim_1200x800.png"
          alt="Music Mouth — a black man's mouth with music symbols flowing out"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            display: "block",
          }}
        />
        {/* Dark gradient fade to background below */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, oklch(0.08 0.01 240 / 0.3) 0%, oklch(0.08 0.01 240 / 0) 40%, oklch(0.08 0.01 240 / 0.85) 80%, oklch(0.08 0.01 240) 100%)",
          }}
        />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 pb-12 -mt-16">
        <div className="w-full max-w-md space-y-8">
          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-3"
          >
            <h2
              className="text-3xl font-bold tracking-tight"
              style={{ color: "oklch(0.96 0.005 240)" }}
            >
              Turn your mouth into music
            </h2>
            <p className="text-base" style={{ color: "oklch(0.65 0.015 240)" }}>
              Beatbox, click, pop, breathe, sneer — every sound you make becomes
              a live instrument. Real-time, quantized, and ready to download.
            </p>
          </motion.div>

          {/* Features */}
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="space-y-3"
          >
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.35 }}
                className="flex items-start gap-3"
              >
                <div
                  className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: "oklch(0.79 0.16 192 / 0.12)",
                    border: "1px solid oklch(0.79 0.16 192 / 0.3)",
                  }}
                >
                  <f.icon
                    className="w-4 h-4"
                    style={{ color: "oklch(0.79 0.16 192)" }}
                  />
                </div>
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.78 0.015 240)" }}
                >
                  {f.text}
                </span>
              </motion.li>
            ))}
          </motion.ul>

          {/* CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="rounded-xl p-6 space-y-4"
            style={{
              background: "oklch(0.12 0.012 240)",
              border: "1px solid oklch(0.28 0.02 240)",
            }}
          >
            <div className="text-center space-y-1">
              <div
                className="text-3xl font-bold"
                style={{ color: "oklch(0.96 0.005 240)" }}
              >
                $4.99
              </div>
              <div
                className="text-xs"
                style={{ color: "oklch(0.6 0.015 240)" }}
              >
                One-time purchase · Full access forever
              </div>
            </div>

            {needsStripeSetup ? (
              <div className="space-y-3">
                <div
                  className="rounded-lg p-3 text-center text-xs"
                  style={{
                    background: "oklch(0.85 0.18 75 / 0.1)",
                    border: "1px solid oklch(0.85 0.18 75 / 0.3)",
                    color: "oklch(0.85 0.18 75)",
                  }}
                  data-ocid="paywall.stripe_config.panel"
                >
                  <Lock className="w-4 h-4 inline mr-1" />
                  Payments not yet configured. Set up Stripe to accept purchases
                  from buyers.
                </div>
                <Button
                  onClick={handleAdminUnlock}
                  className="w-full gap-2 font-bold text-sm"
                  style={{
                    background: "oklch(0.55 0.18 150)",
                    color: "white",
                    boxShadow: "0 0 16px oklch(0.55 0.18 150 / 0.4)",
                  }}
                  data-ocid="paywall.admin_unlock.button"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin: Access Your App
                </Button>
              </div>
            ) : !isLoggedIn ? (
              <Button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full gap-2 font-bold text-base py-5"
                style={{
                  background: "oklch(0.67 0.22 15)",
                  color: "white",
                  boxShadow: "0 0 24px oklch(0.67 0.22 15 / 0.5)",
                }}
                data-ocid="paywall.login_to_unlock.button"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                {isLoggingIn ? "Connecting..." : "Log In to Unlock — $4.99"}
              </Button>
            ) : (
              <Button
                onClick={handleCheckout}
                disabled={createCheckoutSession.isPending}
                className="w-full gap-2 font-bold text-base py-5"
                style={{
                  background: "oklch(0.67 0.22 15)",
                  color: "white",
                  boxShadow: "0 0 24px oklch(0.67 0.22 15 / 0.5)",
                }}
                data-ocid="paywall.checkout.primary_button"
              >
                {createCheckoutSession.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
                {createCheckoutSession.isPending
                  ? "Redirecting to checkout…"
                  : "Unlock Music Mouth — $4.99"}
              </Button>
            )}

            {checkoutError && (
              <p
                className="text-xs text-center"
                style={{ color: "oklch(0.67 0.22 15)" }}
                data-ocid="paywall.checkout.error_state"
              >
                {checkoutError}
              </p>
            )}
          </motion.div>
        </div>
      </main>

      <footer
        className="relative z-10 text-center py-3 border-t"
        style={{ borderColor: "oklch(0.18 0.012 240)" }}
      >
        <p className="text-xs" style={{ color: "oklch(0.55 0.01 240)" }}>
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.79 0.16 192)" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
