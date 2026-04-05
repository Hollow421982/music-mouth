import { useMutation } from "@tanstack/react-query";
import { useActor } from "./useActor";

export type CheckoutSession = {
  id: string;
  url: string;
};

export interface ShoppingItem {
  name: string;
  price: number;
  quantity: bigint;
}

export function useCreateCheckoutSession() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (items: ShoppingItem[]): Promise<CheckoutSession> => {
      if (!actor) throw new Error("Actor not available");
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-failure`;
      // Stripe methods are added by the stripe component at runtime
      const stripeActor = actor as any;
      if (typeof stripeActor.createCheckoutSession !== "function") {
        throw new Error("Stripe not configured on this canister");
      }
      const result = await stripeActor.createCheckoutSession(
        items,
        successUrl,
        cancelUrl,
      );
      const session = JSON.parse(result) as CheckoutSession;
      if (!session?.url) {
        throw new Error("Stripe session missing url");
      }
      return session;
    },
  });
}
