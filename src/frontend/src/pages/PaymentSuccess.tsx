import { Button } from "@/components/ui/button";
import { CheckCircle, Mic } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";

export default function PaymentSuccess() {
  useEffect(() => {
    localStorage.setItem("musicmouth_paid", "true");
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.08 0.01 240)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="flex flex-col items-center gap-6 text-center max-w-sm"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "oklch(0.55 0.18 150 / 0.2)",
            border: "2px solid oklch(0.55 0.18 150 / 0.5)",
          }}
        >
          <CheckCircle
            className="w-10 h-10"
            style={{ color: "oklch(0.72 0.18 150)" }}
          />
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl font-bold"
            style={{ color: "oklch(0.96 0.005 240)" }}
          >
            You&apos;re in!
          </h1>
          <p className="text-lg" style={{ color: "oklch(0.72 0.18 150)" }}>
            Music Mouth is unlocked.
          </p>
          <p className="text-sm" style={{ color: "oklch(0.6 0.015 240)" }}>
            Full access to all features — record, create, and share your beats.
          </p>
        </div>

        <Button
          onClick={() => {
            window.location.href = "/";
          }}
          className="w-full gap-2 font-bold"
          style={{
            background: "oklch(0.67 0.22 15)",
            color: "white",
            boxShadow: "0 0 20px oklch(0.67 0.22 15 / 0.5)",
          }}
          data-ocid="payment_success.primary_button"
        >
          <Mic className="w-4 h-4" />
          Start Creating
        </Button>
      </motion.div>
    </div>
  );
}
