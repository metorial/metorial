import { z } from 'zod';

// IDs arrive as JSON int64 numbers. The raw-body parser preserves their decimal
// spelling before this schema sees them; never coerce an already-rounded Number.
const googleAdsIdSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/)
  .refine(value => BigInt(value) <= 9223372036854775807n, 'Expected a signed 64-bit ID.');
export const positiveGoogleAdsIdSchema = googleAdsIdSchema.refine(value => value !== '0');
const incomingIdSchema = z.union([
  googleAdsIdSchema,
  z
    .bigint()
    .min(0n)
    .max(9223372036854775807n)
    .transform(value => value.toString())
]);

const leadColumnSchema = z.object({
  column_id: z.string().min(1),
  column_name: z.string().optional(),
  string_value: z.string()
});

// Unknown column IDs are deliberately accepted. Top-level secrets and unknown
// envelope fields are stripped rather than copied into callback output.
export const leadWebhookSchema = z.object({
  lead_id: z.string().min(1),
  google_key: z.string().min(1).max(512),
  form_id: incomingIdSchema,
  campaign_id: incomingIdSchema,
  adgroup_id: incomingIdSchema.optional(),
  creative_id: incomingIdSchema.optional(),
  asset_group_id: incomingIdSchema.optional(),
  user_column_data: z.array(leadColumnSchema),
  api_version: z.string().optional(),
  gcl_id: z.string().optional(),
  is_test: z.boolean().optional(),
  lead_stage: z.string().optional(),
  lead_submit_time: z.string().optional(),
  lead_source: z.string().optional()
});

export const leadEventSchema = leadWebhookSchema
  .omit({ google_key: true, is_test: true })
  .extend({
    type: z.literal('lead.received'),
    customerId: positiveGoogleAdsIdSchema,
    form_id: googleAdsIdSchema,
    campaign_id: googleAdsIdSchema,
    adgroup_id: googleAdsIdSchema.optional(),
    creative_id: googleAdsIdSchema.optional(),
    asset_group_id: googleAdsIdSchema.optional()
  })
  .strict();

export const leadOutputSchema = z.object({
  leadId: z.string(),
  customerId: z.string(),
  formId: z.string(),
  campaignId: z.string(),
  adGroupId: z.string().optional(),
  creativeId: z.string().optional(),
  assetGroupId: z.string().optional(),
  googleClickId: z.string().optional(),
  submittedAt: z.string().optional(),
  leadStage: z.string().optional(),
  leadSource: z.string().optional(),
  contact: z.object({
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    companyName: z.string().optional(),
    jobTitle: z.string().optional(),
    workEmail: z.string().optional(),
    workPhone: z.string().optional()
  }),
  answers: z.array(leadColumnSchema)
});
