import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { motion } from "motion/react";

export default function PaymentFailure() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.08 0.01 240)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 text-center max-w-sm"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "oklch(0.67 0.22 15 / 0.15)",
            border: "2px solid oklch(0.67 0.22 15 / 0.4)",
          }}
        >
          <XCircle
            className="w-10 h-10"
            style={{ color: "oklch(0.67 0.22 15)" }}
          />
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl font-bold"
            style={{ color: "oklch(0.96 0.005 240)" }}
          >
            Payment cancelled
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.6 0.015 240)" }}>
            No charges were made. You can try again whenever you&apos;re ready.
          </p>
        </div>

        <Button
          onClick={() => {
            window.location.href = "/";
          }}
          className="w-full font-bold"
          style={{
            background: "oklch(0.22 0.015 240)",
            color: "oklch(0.96 0.005 240)",
            border: "1px solid oklch(0.35 0.02 240)",
          }}
          data-ocid="payment_failure.primary_button"
        >
          Back to Music Mouth
        </Button>
      </motion.div>
    </div>
  );
}
