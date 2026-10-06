import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const optionalText = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const optionalBoolean = z
  .boolean()
  .nullish()
  .transform(value => value ?? undefined);
const optionalNumber = z
  .number()
  .finite()
  .nullish()
  .transform(value => value ?? undefined);
export const resourceId = z
  .string()
  .regex(/^se(-[a-z0-9]+)+$/)
  .max(25);
export const pickupId = z
  .string()
  .regex(/^pik_[A-Za-z0-9]+$/)
  .min(4)
  .max(200);
export const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const money = z.object({
  currency: z.string().min(1),
  amount: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER)
});
export const address = z.object({
  name: optionalText,
  company_name: optionalText,
  phone: optionalText,
  email: optionalText,
  address_line1: z.string(),
  address_line2: optionalText,
  address_line3: optionalText,
  city_locality: optionalText,
  state_province: optionalText,
  postal_code: optionalText,
  country_code: z.string(),
  address_residential_indicator: z.enum(['unknown', 'yes', 'no']).optional(),
  instructions: optionalText,
  geolocation: z
    .array(z.object({ type: z.string().optional(), value: z.string().optional() }))
    .optional()
});
export const partialAddress = address.partial();
export const rate = z.object({
  rate_id: optionalText,
  rate_type: z.string(),
  carrier_id: resourceId,
  carrier_code: z.string(),
  carrier_friendly_name: z.string(),
  service_code: z.string(),
  service_type: z.string(),
  shipping_amount: money,
  insurance_amount: money,
  confirmation_amount: money,
  other_amount: money,
  delivery_days: optionalNumber,
  estimated_delivery_date: optionalText,
  guaranteed_service: z.boolean(),
  trackable: z.boolean(),
  negotiated_rate: z.boolean(),
  package_type: optionalText,
  warning_messages: z.array(z.string())
});
const download = z.object({
  href: optionalText,
  pdf: optionalText,
  png: optionalText,
  zpl: optionalText
});
export const label = z.object({
  label_id: resourceId,
  shipment_id: resourceId,
  status: z.string(),
  tracking_number: optionalText,
  carrier_id: optionalText,
  carrier_code: optionalText,
  service_code: optionalText,
  external_order_id: optionalText,
  ship_date: optionalText,
  created_at: optionalText,
  shipment_cost: money.optional(),
  insurance_cost: money.optional(),
  trackable: optionalBoolean,
  voided: optionalBoolean,
  voided_at: optionalText,
  is_return_label: optionalBoolean,
  is_international: optionalBoolean,
  label_format: optionalText,
  label_download: download.optional(),
  form_download: z
    .object({ href: optionalText })
    .nullish()
    .transform(value => value ?? undefined),
  packages: z.array(z.object({ label_download: download.optional() })).optional(),
  external_shipment_id: optionalText,
  refund_status: optionalText
});
export const shipment = z.object({
  shipment_id: resourceId,
  carrier_id: optionalText,
  service_code: optionalText,
  shipping_rule_id: optionalText,
  external_order_id: optionalText,
  items: z.array(z.record(z.string(), z.unknown())).optional(),
  tax_identifiers: z
    .array(z.record(z.string(), z.unknown()))
    .nullish()
    .transform(value => value ?? undefined),
  shipment_number: optionalText,
  is_return: optionalBoolean,
  order_source_code: optionalText,
  comparison_rate_type: optionalText,
  external_shipment_id: optionalText,
  ship_date: z.string(),
  created_at: z.string(),
  modified_at: optionalText,
  shipment_status: z.string(),
  ship_to: address,
  ship_from: address,
  warehouse_id: optionalText,
  return_to: address.nullish().transform(value => value ?? undefined),
  confirmation: optionalText,
  customs: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform(value => value ?? undefined),
  advanced_options: z.record(z.string(), z.unknown()).optional(),
  insurance_provider: optionalText,
  tags: z.array(z.object({ name: z.string() })),
  packages: z.array(z.record(z.string(), z.unknown())),
  total_weight: z.object({ value: z.number().finite(), unit: z.string() }).optional(),
  errors: z.array(z.record(z.string(), z.unknown())).optional()
});
export const warehouse = z.object({
  warehouse_id: resourceId,
  name: z.string(),
  created_at: z.string(),
  is_default: optionalBoolean,
  origin_address: address,
  return_address: address
});
const window = z.object({ start_at: z.string(), end_at: z.string() });
export const pickup = z.object({
  pickup_id: pickupId,
  label_ids: z.array(resourceId),
  carrier_id: resourceId,
  created_at: z.string(),
  confirmation_number: optionalText,
  warehouse_id: optionalText,
  cancelled_at: optionalText,
  canceled_at: optionalText,
  pickup_window: z.union([window, z.array(window)]).optional(),
  pickup_windows: z.array(window).optional()
});
export const manifest = z.object({
  manifest_id: resourceId,
  form_id: optionalText,
  created_at: z.string(),
  ship_date: z.string(),
  shipments: count,
  carrier_id: resourceId,
  warehouse_id: optionalText,
  submission_id: optionalText,
  label_ids: z.array(resourceId).optional(),
  manifest_download: z.object({ href: optionalText }).optional()
});
export const manifestRequest = z.object({
  manifest_request_id: resourceId,
  status: z.string()
});
export const manifestsResponse = z.object({
  manifests: z.array(manifest).optional(),
  manifest_requests: z.array(manifestRequest).optional(),
  manifest_id: resourceId.optional(),
  form_id: optionalText,
  carrier_id: optionalText,
  created_at: optionalText,
  ship_date: optionalText,
  shipments: count.optional(),
  manifest_download: z.object({ href: optionalText }).optional(),
  errors: z.array(z.record(z.string(), z.unknown())).optional()
});
export const tracking = z.object({
  tracking_number: z.string(),
  tracking_url: optionalText,
  status_code: z.string(),
  status_description: z.string(),
  carrier_code: optionalText,
  carrier_status_code: optionalText,
  carrier_status_description: optionalText,
  ship_date: optionalText,
  estimated_delivery_date: optionalText,
  actual_delivery_date: optionalText,
  exception_description: optionalText,
  events: z.array(
    z.object({
      occurred_at: z.string(),
      description: z.string(),
      city_locality: optionalText,
      state_province: optionalText,
      postal_code: optionalText,
      country_code: optionalText,
      company_name: optionalText,
      signer: optionalText,
      status_code: optionalText,
      status_description: optionalText
    })
  )
});
export const carrier = z.object({
  carrier_id: resourceId,
  carrier_code: z.string(),
  nickname: optionalText,
  friendly_name: z.string(),
  account_number: optionalText,
  balance: optionalNumber,
  primary: optionalBoolean,
  requires_funded_amount: optionalBoolean,
  supports_label_messages: optionalBoolean
});
// Compare only provider money tokens; benign exponent and trailing-zero spelling is equivalent.
const decimal = (token: string) => {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!match) return undefined;
  const digits = `${match[2]}${match[3] ?? ''}`.replace(/^0+/, '') || '0';
  const exponent = Number(match[4] ?? 0) - (match[3]?.length ?? 0);
  if (!Number.isSafeInteger(exponent)) return undefined;
  const trimmed = digits.replace(/0+$/, '') || '0';
  return trimmed === '0'
    ? '0'
    : `${match[1]}${trimmed}e${exponent + digits.length - trimmed.length}`;
};
export const parseResponse = (data: unknown): unknown => {
  if (typeof data !== 'string' || data === '') return data;
  try {
    for (const match of data.matchAll(
      /("(?:[^"\\]|\\.)*")\s*:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
    )) {
      if (!match[1]) continue;
      const key = JSON.parse(match[1]);
      if (key !== 'amount' && key !== 'balance') continue;
      const token = match[2];
      if (!token || decimal(token) !== decimal(String(Number(token)))) {
        throw createApiServiceError(
          'ShipEngine returned money that cannot be represented accurately. Check the provider record before continuing.'
        );
      }
    }
    return JSON.parse(data);
  } catch {
    throw createApiServiceError(
      'ShipEngine returned invalid or imprecise data. Check the provider record before retrying any purchase or change.'
    );
  }
};
