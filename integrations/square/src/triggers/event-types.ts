// Event names and OAuth permissions: https://developer.squareup.com/reference/square/webhooks
export const squareEventTypes = {
  payment: ['payment.created', 'payment.updated'],
  order: ['order.created', 'order.updated', 'order.fulfillment.updated'],
  customer: ['customer.created', 'customer.updated', 'customer.deleted'],
  invoice: [
    'invoice.created',
    'invoice.updated',
    'invoice.published',
    'invoice.canceled',
    'invoice.deleted',
    'invoice.payment_made',
    'invoice.refunded',
    'invoice.scheduled_charge_failed'
  ],
  catalog: ['catalog.version.updated'],
  inventory: ['inventory.count.updated'],
  refund: ['refund.created', 'refund.updated'],
  booking: ['booking.created', 'booking.updated'],
  dispute: [
    'dispute.created',
    'dispute.state.updated',
    'dispute.evidence.created',
    'dispute.evidence.deleted'
  ],
  subscription: ['subscription.created', 'subscription.updated'],
  loyalty: [
    'loyalty.account.created',
    'loyalty.account.updated',
    'loyalty.event.created',
    'loyalty.program.created',
    'loyalty.program.updated',
    'loyalty.promotion.created',
    'loyalty.promotion.updated'
  ]
} as const;

export type SquareEventFamily = keyof typeof squareEventTypes;
export const supportedSquareEventTypes = Object.values(squareEventTypes).flat();
const supported = new Set<string>(supportedSquareEventTypes);

export const isSupportedSquareEvent = (type: string): boolean => supported.has(type);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const expectedSquareDataType = (type: string): string => {
  if (type.startsWith('order.')) return type.replaceAll('.', '_');
  if (type.startsWith('loyalty.')) return `loyalty_${type.split('.')[1]}`;
  if (type === 'catalog.version.updated') return 'catalog_version';
  if (type === 'inventory.count.updated') return 'inventory_counts';
  return type.split('.')[0] ?? '';
};

export const hasCurrentSquareEventData = (event: {
  type: string;
  data: { type: string; object?: Record<string, unknown>; deleted?: boolean };
}): boolean => {
  const expectedType = expectedSquareDataType(event.type);
  if (event.data.type !== expectedType) return false;
  if (event.type === 'invoice.deleted') return event.data.deleted === true;
  const resource = event.data.object?.[expectedType];
  if (expectedType === 'inventory_counts') {
    return Array.isArray(resource) && resource.length > 0 && resource.every(isRecord);
  }
  if (!isRecord(resource)) return false;
  if (expectedType === 'catalog_version') {
    return typeof resource.updated_at === 'string' && resource.updated_at.length > 0;
  }
  return true;
};

export const matchesSquareFamily = (family: SquareEventFamily, value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.type === 'string' &&
    (squareEventTypes[family] as readonly string[]).includes(event.type) &&
    typeof event.event_id === 'string' &&
    event.event_id.length > 0 &&
    typeof event.merchant_id === 'string' &&
    event.merchant_id.length > 0 &&
    isRecord(event.data) &&
    typeof event.data.type === 'string' &&
    hasCurrentSquareEventData(
      event as {
        type: string;
        data: { type: string; object?: Record<string, unknown>; deleted?: boolean };
      }
    )
  );
};
