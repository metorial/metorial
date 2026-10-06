import { z } from 'zod';
import { invalid } from './helpers';

const string = z
  .string()
  .nullish()
  .transform(v => v ?? undefined);
const number = z
  .number()
  .nullish()
  .transform(v => v ?? undefined);
const boolean = z
  .boolean()
  .nullish()
  .transform(v => v ?? undefined);
const location = z
  .object({ city: string, state: string, zip: string, country: string })
  .loose();
export const trackingEventSchema = z
  .object({
    status: string,
    status_details: string,
    status_date: string,
    location: location.nullish().transform(v => v ?? undefined)
  })
  .loose();
const servicelevel = z
  .object({ name: string, token: string })
  .loose()
  .nullish()
  .transform(v => v ?? undefined);
export const rateSchema = z
  .object({
    object_id: z.string(),
    provider: string,
    amount: string,
    currency: string,
    amount_local: string,
    currency_local: string,
    servicelevel,
    carrier_account: string,
    estimated_days: number,
    duration_terms: string,
    arrives_by: string,
    test: boolean
  })
  .loose();
const batchPage = z
  .object({
    count: number,
    next: string,
    previous: string,
    results: z.array(z.record(z.string(), z.unknown()))
  })
  .loose();
export const resourceSchema = z
  .object({
    object_id: z.string(),
    object_created: string,
    object_updated: string,
    status: string,
    test: boolean,
    name: string,
    to_address: z
      .object({ name: string })
      .loose()
      .nullish()
      .transform(v => v ?? undefined),
    company: string,
    street1: string,
    street2: string,
    street3: string,
    city: string,
    state: string,
    zip: string,
    country: string,
    phone: string,
    email: string,
    is_residential: boolean,
    is_complete: boolean,
    validation_results: z
      .object({ is_valid: boolean })
      .loose()
      .nullish()
      .transform(v => v ?? undefined),
    rates: z
      .array(rateSchema)
      .nullish()
      .transform(v => v ?? undefined),
    address_from: z.unknown().optional(),
    address_to: z.unknown().optional(),
    parcels: z
      .array(z.unknown())
      .nullish()
      .transform(v => v ?? undefined),
    metadata: string,
    contents_type: string,
    incoterm: string,
    label_url: z
      .union([z.string(), z.array(z.string())])
      .nullish()
      .transform(v => v ?? undefined),
    commercial_invoice_url: string,
    label_file_type: string,
    label_filetype: string,
    tracking_number: string,
    rate: z
      .union([z.string(), rateSchema])
      .nullish()
      .transform(v => v ?? undefined),
    messages: z
      .array(z.unknown())
      .nullish()
      .transform(v => v ?? undefined),
    carrier: string,
    carrier_account: string,
    account_id: string,
    active: boolean,
    shipment_date: string,
    documents: z
      .array(z.string())
      .nullish()
      .transform(v => v ?? undefined),
    errors: z
      .array(z.unknown())
      .nullish()
      .transform(v => v ?? undefined),
    batch_shipments: batchPage.nullish().transform(v => v ?? undefined),
    transaction: string,
    confirmation_code: string,
    is_test: boolean,
    length: string,
    width: string,
    height: string,
    distance_unit: string,
    weight: string,
    weight_unit: string,
    order_number: string,
    order_status: string,
    placed_at: string,
    total_price: string,
    currency: string,
    shipping_method: string
  })
  .loose();
export const carrierTemplateSchema = z
  .object({
    token: z.string(),
    carrier: string,
    name: string,
    length: string,
    width: string,
    height: string,
    distance_unit: string
  })
  .loose();
export const trackingSchema = z
  .object({
    carrier: z.string(),
    tracking_number: z.string(),
    address_from: z.unknown().optional(),
    address_to: z.unknown().optional(),
    eta: string,
    tracking_status: trackingEventSchema.nullish().transform(v => v ?? undefined),
    tracking_history: z.array(trackingEventSchema),
    servicelevel,
    metadata: string
  })
  .loose();
export type Resource = z.infer<typeof resourceSchema>;
export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw invalid(
      'Shippo returned an invalid response for this resource. Check the supported API version and account history.'
    );
  return result.data;
}
