import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { requireSquareScopes } from '../lib/helpers';

export let checkoutMoneyInput = z.object({
  amount: z.number().int().positive().describe('Amount in the smallest currency unit'),
  currency: z.string().length(3).describe('Three-letter currency code, such as USD')
});

export let checkoutAddressInput = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  locality: z.string().optional(),
  administrativeDistrictLevel1: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

export let checkoutOptionsInput = z.object({
  allowTipping: z.boolean().optional(),
  subscriptionPlanId: z
    .string()
    .max(255)
    .optional()
    .describe('Catalog subscription plan variation ID for recurring checkout'),
  redirectUrl: z.string().url().max(2048).optional(),
  merchantSupportEmail: z.string().email().max(256).optional(),
  askForShippingAddress: z.boolean().optional(),
  acceptedPaymentMethods: z
    .object({
      applePay: z.boolean().optional(),
      googlePay: z.boolean().optional(),
      cashAppPay: z.boolean().optional(),
      afterpayClearpay: z.boolean().optional()
    })
    .optional(),
  appFeeMoney: checkoutMoneyInput
    .optional()
    .describe('Application fee; requires PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS'),
  shippingFee: z
    .object({
      name: z.string().min(1),
      charge: checkoutMoneyInput
    })
    .optional(),
  customFields: z
    .array(z.object({ title: z.string().min(1).max(50) }))
    .max(2)
    .optional(),
  enableCoupon: z.boolean().optional(),
  enableLoyalty: z.boolean().optional()
});

export let prePopulatedDataInput = z.object({
  buyerEmail: z.string().email().max(256).optional(),
  buyerPhoneNumber: z.string().max(17).optional(),
  buyerAddress: checkoutAddressInput.optional()
});

export let quickPayInput = z.object({
  name: z.string().min(1).max(255),
  priceMoney: checkoutMoneyInput,
  locationId: z.string().min(1).describe('Location ID; call list_locations to discover it')
});

export let checkoutLineItemInput = z.object({
  name: z.string().min(1).max(512).optional(),
  catalogObjectId: z.string().max(192).optional().describe('Catalog item variation ID'),
  quantity: z.string().min(1).max(12).describe('Decimal quantity, such as 1 or 2.5'),
  basePriceMoney: checkoutMoneyInput.optional(),
  note: z.string().max(2000).optional()
});

export let checkoutOrderInput = z.object({
  locationId: z.string().min(1).describe('Location ID; call list_locations to discover it'),
  lineItems: z.array(checkoutLineItemInput).min(1),
  customerId: z.string().optional(),
  referenceId: z.string().optional(),
  autoApplyTaxes: z.boolean().optional()
});

export let paymentLinkOutputSchema = z.object({
  paymentLinkId: z.string(),
  version: z.number(),
  orderId: z.string().optional(),
  url: z.string().optional(),
  longUrl: z.string().optional(),
  description: z.string().optional(),
  checkoutOptions: z.record(z.string(), z.unknown()).optional(),
  prePopulatedData: z.record(z.string(), z.unknown()).optional(),
  paymentNote: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export interface SquarePaymentLink {
  id: string;
  version: number;
  order_id?: string;
  url?: string;
  long_url?: string;
  description?: string;
  checkout_options?: Record<string, unknown>;
  pre_populated_data?: Record<string, unknown>;
  payment_note?: string;
  created_at?: string;
  updated_at?: string;
}

export let mapPaymentLink = (link: SquarePaymentLink) => ({
  paymentLinkId: link.id,
  version: link.version,
  orderId: link.order_id,
  url: link.url,
  longUrl: link.long_url,
  description: link.description,
  checkoutOptions: link.checkout_options,
  prePopulatedData: link.pre_populated_data,
  paymentNote: link.payment_note,
  createdAt: link.created_at,
  updatedAt: link.updated_at
});

export let mapCheckoutAddress = (address: z.infer<typeof checkoutAddressInput>) => ({
  address_line_1: address.addressLine1,
  address_line_2: address.addressLine2,
  locality: address.locality,
  administrative_district_level_1: address.administrativeDistrictLevel1,
  postal_code: address.postalCode,
  country: address.country,
  first_name: address.firstName,
  last_name: address.lastName
});

export let mapCheckoutOptions = (options: z.infer<typeof checkoutOptionsInput>) => ({
  allow_tipping: options.allowTipping,
  subscription_plan_id: options.subscriptionPlanId,
  redirect_url: options.redirectUrl,
  merchant_support_email: options.merchantSupportEmail,
  ask_for_shipping_address: options.askForShippingAddress,
  accepted_payment_methods: options.acceptedPaymentMethods
    ? {
        apple_pay: options.acceptedPaymentMethods.applePay,
        google_pay: options.acceptedPaymentMethods.googlePay,
        cash_app_pay: options.acceptedPaymentMethods.cashAppPay,
        afterpay_clearpay: options.acceptedPaymentMethods.afterpayClearpay
      }
    : undefined,
  app_fee_money: options.appFeeMoney,
  shipping_fee: options.shippingFee
    ? { name: options.shippingFee.name, charge: options.shippingFee.charge }
    : undefined,
  custom_fields: options.customFields?.map(field => ({ title: field.title })),
  enable_coupon: options.enableCoupon,
  enable_loyalty: options.enableLoyalty
});

export let mapPrePopulatedData = (data: z.infer<typeof prePopulatedDataInput>) => ({
  buyer_email: data.buyerEmail,
  buyer_phone_number: data.buyerPhoneNumber,
  buyer_address: data.buyerAddress ? mapCheckoutAddress(data.buyerAddress) : undefined
});

export let validateCheckoutOptions = (
  auth: { scopes: string[] },
  options?: z.infer<typeof checkoutOptionsInput>,
  priceMoney?: z.infer<typeof checkoutMoneyInput>
) => {
  if (!options?.appFeeMoney) return;
  requireSquareScopes(auth, ['PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS']);
  if (priceMoney) {
    if (options.appFeeMoney.currency !== priceMoney.currency) {
      throw createApiServiceError(
        'Application fee currency must match the checkout price currency.'
      );
    }
    if (options.appFeeMoney.amount * 10 > priceMoney.amount * 9) {
      throw createApiServiceError('Application fee cannot exceed 90% of the checkout price.');
    }
  }
};
