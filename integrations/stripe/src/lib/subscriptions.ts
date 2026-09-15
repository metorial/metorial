import { z } from 'zod';

export const subscriptionItemSchema = z.object({
  subscriptionItemId: z.string(),
  priceId: z.string(),
  quantity: z.number().optional(),
  currentPeriodStart: z.number().optional(),
  currentPeriodEnd: z.number().optional()
});

type Subscription = {
  current_period_start?: number;
  current_period_end?: number;
  items?: {
    data: Array<{
      id: string;
      price: string | { id: string };
      quantity?: number;
      current_period_start?: number;
      current_period_end?: number;
    }>;
    has_more?: boolean;
  };
};

export const mapSubscriptionPeriods = (subscription: Subscription) => {
  const items = subscription.items?.data ?? [];
  // Mixed-interval subscriptions have no single billing period. Preserve the
  // legacy summary only when every returned item agrees, and expose item periods.
  const commonPeriod = (key: 'current_period_start' | 'current_period_end') => {
    const first = items[0]?.[key];
    return !subscription.items?.has_more && items.every(item => item[key] === first)
      ? first
      : undefined;
  };
  return {
    currentPeriodStart:
      subscription.current_period_start ?? commonPeriod('current_period_start'),
    currentPeriodEnd: subscription.current_period_end ?? commonPeriod('current_period_end'),
    items: items.map(item => ({
      subscriptionItemId: item.id,
      priceId: typeof item.price === 'string' ? item.price : item.price.id,
      quantity: item.quantity,
      currentPeriodStart: item.current_period_start ?? subscription.current_period_start,
      currentPeriodEnd: item.current_period_end ?? subscription.current_period_end
    })),
    itemsHasMore: subscription.items?.has_more ?? false
  };
};
