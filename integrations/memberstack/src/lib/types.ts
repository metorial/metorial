import { z } from 'zod';

export let authProviderSchema = z.object({
  provider: z.string()
});

export let authSchema = z.object({
  email: z.string(),
  hasPassword: z.boolean().optional(),
  providers: z.array(authProviderSchema).optional()
});

export let paymentSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  lastBillingDate: z.number().nullable().optional(),
  nextBillingDate: z.number().nullable().optional(),
  cancelAtDate: z.number().nullable().optional()
});

export let planConnectionSchema = z.object({
  id: z.string().describe('Plan connection ID'),
  active: z.boolean().optional(),
  status: z.string().optional(),
  planId: z.string().optional(),
  planName: z.string().optional(),
  type: z.string().optional(),
  payment: paymentSchema.nullable().optional()
});

export let memberSchema = z.object({
  memberId: z.string().describe('Unique member ID'),
  auth: authSchema.describe('Authentication details'),
  verified: z.boolean().optional().describe('Whether the member is email-verified'),
  profileImage: z.string().nullable().optional().describe('URL of profile image'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastLogin: z.string().nullable().optional().describe('ISO 8601 last login timestamp'),
  stripeCustomerId: z.string().nullable().optional().describe('Associated Stripe customer ID'),
  customFields: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom fields key-value pairs'),
  metaData: z.record(z.string(), z.any()).optional().describe('Metadata key-value pairs'),
  json: z.any().optional().describe('Arbitrary JSON data'),
  permissions: z.array(z.string()).optional().describe('Array of permission strings'),
  loginRedirect: z.string().nullable().optional().describe('URL to redirect after login'),
  planConnections: z
    .array(planConnectionSchema)
    .optional()
    .describe('Array of plan connections'),
  teams: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Team memberships when requested'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider member data')
});

export type Member = z.infer<typeof memberSchema>;

export let tokenVerificationSchema = z.object({
  memberId: z.string().describe('Member ID from the token'),
  type: z.string().optional().describe('Token type'),
  issuedAt: z.number().optional().describe('Token issued at (Unix timestamp)'),
  expiresAt: z.number().optional().describe('Token expiration (Unix timestamp)'),
  audience: z.string().optional().describe('Token audience (app ID)'),
  issuer: z.string().optional().describe('Token issuer'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Complete verified token claims')
});

export let tableKeySchema = z
  .string()
  .min(1)
  .describe(
    'Data table key or ID. Call list_data_tables to discover tables and get_data_table to inspect field keys.'
  );

export let dataRecordSchema = z.object({
  id: z.string().describe('Record ID'),
  tableKey: z.string().optional(),
  createdByMemberId: z.string().nullable().optional(),
  data: z
    .record(z.string(), z.unknown())
    .describe('Actual field values returned by the provider'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  internalOrder: z.number().optional(),
  raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider record')
});
