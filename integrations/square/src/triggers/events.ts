import { allOf, SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { squareApplicationEvents } from './application-events-trigger-group';
import { type SquareEventEnvelope, squareEventEnvelopeSchema } from './event-schemas';
import { matchesSquareFamily, type SquareEventFamily } from './event-types';

const record = z.record(z.string(), z.unknown());
const money = z.object({ amount: z.number(), currency: z.string() }).loose();
const baseOutput = {
  eventId: z.string(),
  merchantId: z.string(),
  eventCreatedAt: z.string(),
  dataId: z.string()
};
const base = (event: SquareEventEnvelope) => ({
  eventId: event.event_id,
  merchantId: event.merchant_id,
  eventCreatedAt: event.created_at,
  dataId: event.data.id
});
const object = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
const resource = (event: SquareEventEnvelope, key: string) => object(event.data.object?.[key]);
const createFamily = (
  family: SquareEventFamily,
  name: string,
  description: string,
  permission: string,
  output: z.ZodType<Record<string, unknown>>,
  mapOutput: (event: SquareEventEnvelope) => Record<string, unknown>
) =>
  SlateTrigger.create(spec, { name, key: `${family}_events`, description })
    .scopes(allOf(permission))
    .triggerGroup(squareApplicationEvents)
    .input(squareEventEnvelopeSchema)
    .output(output)
    .matches(value => matchesSquareFamily(family, value))
    .map(async ctx => ({
      type: ctx.input.type,
      id: ctx.input.event_id,
      output: mapOutput(ctx.input)
    }))
    .build();

// https://developer.squareup.com/reference/square/payments-api/webhooks/payment.created
export const paymentEvents = createFamily(
  'payment',
  'Payment Events',
  'A payment is created or its status changes.',
  'PAYMENTS_READ',
  z.object({
    ...baseOutput,
    paymentId: z.string(),
    status: z.string().optional(),
    amountMoney: money.optional(),
    totalMoney: money.optional(),
    sourceType: z.string().optional(),
    locationId: z.string().optional(),
    orderId: z.string().optional(),
    customerId: z.string().optional(),
    receiptUrl: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    payment: record
  }),
  event => {
    const payment = resource(event, 'payment');
    return {
      ...base(event),
      paymentId: payment.id ?? event.data.id,
      status: payment.status,
      amountMoney: payment.amount_money,
      totalMoney: payment.total_money,
      sourceType: payment.source_type,
      locationId: payment.location_id,
      orderId: payment.order_id,
      customerId: payment.customer_id,
      receiptUrl: payment.receipt_url,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      payment
    };
  }
);

// https://developer.squareup.com/reference/square/orders-api/webhooks/order.fulfillment.updated
export const orderEvents = createFamily(
  'order',
  'Order Events',
  'An order is created, updated, or its fulfillment changes.',
  'ORDERS_READ',
  z.object({
    ...baseOutput,
    orderId: z.string(),
    locationId: z.string().optional(),
    state: z.string().optional(),
    version: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    fulfillmentUpdates: z.array(record).optional(),
    orderChange: record
  }),
  event => {
    const isFulfillment = event.type === 'order.fulfillment.updated';
    const order = resource(event, event.data.type);
    return {
      ...base(event),
      orderId: order.order_id ?? order.id ?? event.data.id,
      locationId: order.location_id,
      state: order.state,
      version: order.version,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      fulfillmentUpdates: isFulfillment ? order.fulfillment_update : undefined,
      orderChange: order
    };
  }
);

// https://developer.squareup.com/reference/square/customers-api/webhooks/customer.deleted
export const customerEvents = createFamily(
  'customer',
  'Customer Events',
  'A customer profile is created, updated, or deleted.',
  'CUSTOMERS_READ',
  z.object({
    ...baseOutput,
    customerId: z.string(),
    deleted: z.boolean(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    emailAddress: z.string().optional(),
    phoneNumber: z.string().optional(),
    companyName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    customer: record.optional()
  }),
  event => {
    const customer = resource(event, 'customer');
    return {
      ...base(event),
      customerId: customer.id ?? event.data.id,
      deleted: event.data.deleted === true,
      givenName: customer.given_name,
      familyName: customer.family_name,
      emailAddress: customer.email_address,
      phoneNumber: customer.phone_number,
      companyName: customer.company_name,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      customer: Object.keys(customer).length ? customer : undefined
    };
  }
);

// https://developer.squareup.com/reference/square/invoices-api/webhooks/invoice.deleted
export const invoiceEvents = createFamily(
  'invoice',
  'Invoice Events',
  'An invoice is created, changed, published, canceled, deleted, paid, refunded, or has a failed scheduled charge.',
  'INVOICES_READ',
  z.object({
    ...baseOutput,
    invoiceId: z.string(),
    deleted: z.boolean(),
    invoiceNumber: z.string().optional(),
    status: z.string().optional(),
    orderId: z.string().optional(),
    locationId: z.string().optional(),
    publicUrl: z.string().optional(),
    version: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    invoice: record.optional()
  }),
  event => {
    const invoice = resource(event, 'invoice');
    return {
      ...base(event),
      invoiceId: invoice.id ?? event.data.id,
      deleted: event.data.deleted === true,
      invoiceNumber: invoice.invoice_number,
      status: invoice.status,
      orderId: invoice.order_id,
      locationId: invoice.location_id,
      publicUrl: invoice.public_url,
      version: invoice.version,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      invoice: Object.keys(invoice).length ? invoice : undefined
    };
  }
);

// https://developer.squareup.com/reference/square/catalog-api/webhooks/catalog.version.updated
export const catalogEvents = createFamily(
  'catalog',
  'Catalog Events',
  'The catalog version changes.',
  'ITEMS_READ',
  z.object({ ...baseOutput, updatedAt: z.string(), catalogVersion: record }),
  event => {
    const catalogVersion = resource(event, 'catalog_version');
    return { ...base(event), updatedAt: catalogVersion.updated_at, catalogVersion };
  }
);

// https://developer.squareup.com/reference/square/inventory-api/webhooks/inventory.count.updated
export const inventoryEvents = createFamily(
  'inventory',
  'Inventory Events',
  'One or more inventory counts change.',
  'INVENTORY_READ',
  z.object({
    ...baseOutput,
    inventoryCounts: z.array(
      z
        .object({
          calculated_at: z.string().optional(),
          catalog_object_id: z.string().optional(),
          catalog_object_type: z.string().optional(),
          location_id: z.string().optional(),
          quantity: z.string().optional(),
          state: z.string().optional()
        })
        .loose()
    )
  }),
  event => ({
    ...base(event),
    inventoryCounts: Array.isArray(event.data.object?.inventory_counts)
      ? event.data.object.inventory_counts
      : []
  })
);

// https://developer.squareup.com/reference/square/refunds-api/webhooks/refund.created
export const refundEvents = createFamily(
  'refund',
  'Refund Events',
  'A payment refund is created or updated.',
  'PAYMENTS_READ',
  z.object({
    ...baseOutput,
    refundId: z.string(),
    status: z.string().optional(),
    amountMoney: money.optional(),
    paymentId: z.string().optional(),
    orderId: z.string().optional(),
    locationId: z.string().optional(),
    reason: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    refund: record
  }),
  event => {
    const refund = resource(event, 'refund');
    return {
      ...base(event),
      refundId: refund.id ?? event.data.id,
      status: refund.status,
      amountMoney: refund.amount_money,
      paymentId: refund.payment_id,
      orderId: refund.order_id,
      locationId: refund.location_id,
      reason: refund.reason,
      createdAt: refund.created_at,
      updatedAt: refund.updated_at,
      refund
    };
  }
);

// https://developer.squareup.com/reference/square/bookings-api/webhooks/booking.updated
export const bookingEvents = createFamily(
  'booking',
  'Booking Events',
  'A booking is created, updated, or canceled.',
  'APPOINTMENTS_READ',
  z.object({
    ...baseOutput,
    bookingId: z.string(),
    status: z.string().optional(),
    locationId: z.string().optional(),
    customerId: z.string().optional(),
    startAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    version: z.number().optional(),
    booking: record
  }),
  event => {
    const booking = resource(event, 'booking');
    return {
      ...base(event),
      bookingId: booking.id ?? event.data.id,
      status: booking.status,
      locationId: booking.location_id,
      customerId: booking.customer_id,
      startAt: booking.start_at,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      version: booking.version,
      booking
    };
  }
);

// https://developer.squareup.com/reference/square/disputes-api/webhooks/dispute.evidence.deleted
export const disputeEvents = createFamily(
  'dispute',
  'Dispute Events',
  'A dispute is created, its state changes, or evidence is added or removed.',
  'DISPUTES_READ',
  z.object({
    ...baseOutput,
    disputeId: z.string(),
    state: z.string().optional(),
    reason: z.string().optional(),
    disputedPaymentId: z.string().optional(),
    locationId: z.string().optional(),
    amountMoney: money.optional(),
    dueAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    dispute: record
  }),
  event => {
    const dispute = resource(event, 'dispute');
    return {
      ...base(event),
      disputeId: dispute.id ?? event.data.id,
      state: dispute.state,
      reason: dispute.reason,
      disputedPaymentId: dispute.disputed_payment?.payment_id,
      locationId: dispute.location_id,
      amountMoney: dispute.amount_money,
      dueAt: dispute.due_at,
      createdAt: dispute.created_at,
      updatedAt: dispute.updated_at,
      dispute
    };
  }
);

// https://developer.squareup.com/reference/square/subscriptions-api/webhooks/subscription.updated
export const subscriptionEvents = createFamily(
  'subscription',
  'Subscription Events',
  'A subscription is created or its status changes.',
  'SUBSCRIPTIONS_READ',
  z.object({
    ...baseOutput,
    subscriptionId: z.string(),
    status: z.string().optional(),
    locationId: z.string().optional(),
    customerId: z.string().optional(),
    planVariationId: z.string().optional(),
    startDate: z.string().optional(),
    canceledDate: z.string().optional(),
    version: z.number().optional(),
    subscription: record
  }),
  event => {
    const subscription = resource(event, 'subscription');
    return {
      ...base(event),
      subscriptionId: subscription.id ?? event.data.id,
      status: subscription.status,
      locationId: subscription.location_id,
      customerId: subscription.customer_id,
      planVariationId: subscription.plan_variation_id,
      startDate: subscription.start_date,
      canceledDate: subscription.canceled_date,
      version: subscription.version,
      subscription
    };
  }
);

// https://developer.squareup.com/reference/square/loyalty-api/webhooks/loyalty.event.created
export const loyaltyEvents = createFamily(
  'loyalty',
  'Loyalty Events',
  'A loyalty account, event, program, or promotion changes.',
  'LOYALTY_READ',
  z.object({
    ...baseOutput,
    loyaltyAccountId: z.string().optional(),
    loyaltyEventId: z.string().optional(),
    loyaltyProgramId: z.string().optional(),
    loyaltyPromotionId: z.string().optional(),
    customerId: z.string().optional(),
    balance: z.number().optional(),
    lifetimePoints: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    resource: record.optional(),
    deleted: z.boolean()
  }),
  event => {
    const kind = event.data.type;
    const value = resource(event, kind);
    return {
      ...base(event),
      loyaltyAccountId:
        kind === 'loyalty_account' ? (value.id ?? event.data.id) : value.loyalty_account_id,
      loyaltyEventId: kind === 'loyalty_event' ? (value.id ?? event.data.id) : undefined,
      loyaltyProgramId:
        kind === 'loyalty_program'
          ? (value.id ?? event.data.id)
          : (value.program_id ??
            value.loyalty_program_id ??
            value.adjust_points?.loyalty_program_id),
      loyaltyPromotionId:
        kind === 'loyalty_promotion' ? (value.id ?? event.data.id) : undefined,
      customerId: value.customer_id,
      balance: value.balance,
      lifetimePoints: value.lifetime_points,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
      resource: Object.keys(value).length ? value : undefined,
      deleted: event.data.deleted === true
    };
  }
);
