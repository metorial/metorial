import { z } from 'zod';
import { paginationOutputSchema } from '../lib/pagination';

export const rawRecordSchema = z.record(z.string(), z.any());
export const rawRecordArraySchema = z.array(rawRecordSchema);

export const confirmSchema = z
  .boolean()
  .describe('Must be true to confirm this high-risk, destructive, or irreversible action.');

export const idempotencyKeySchema = z
  .string()
  .min(1)
  .describe(
    'Natural Idempotency-Key header. Reuse the same key when retrying the same operation.'
  );

export const amountSchema = z.number().int().positive().describe('Amount in cents.');

export const currencySchema = z
  .enum(['USD'])
  .optional()
  .describe('Currency code. Defaults to USD.');

export const limitsSchema = z
  .object({
    perTransaction: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .describe('Per-transaction limit in cents. Use null to clear this cap.'),
    perDay: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .describe('Daily limit in cents. Use null to clear this cap.'),
    perMonth: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .describe('Monthly limit in cents. Use null to clear this cap.')
  })
  .optional()
  .describe(
    'Natural agent limits. Provided fields replace current values; null clears a cap.'
  );

export const perTransactionLimitsSchema = z
  .object({
    perTransaction: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .describe('Per-transaction limit in cents. Use null to clear this cap.')
  })
  .optional()
  .describe('Delegation limit settings.');

export const recipientSchema = z.object({
  type: z.enum(['email', 'phone', 'party_id']).describe('Recipient identifier type.'),
  value: z.string().min(1).describe('Recipient value for the selected type.')
});

export const counterpartySchema = z.object({
  type: z
    .enum(['email', 'phone', 'party_id', 'agent_id', 'handle'])
    .describe('Counterparty identifier type.'),
  value: z.string().min(1).describe('Counterparty identifier value.')
});

export const payerSchema = z.object({
  type: z
    .enum(['email', 'phone', 'party_id', 'agent_id'])
    .describe('Payment request payer identifier type.'),
  value: z.string().min(1).describe('Payer identifier value.')
});

export const paginationSchema = paginationOutputSchema;

export const listOutput = (itemKey: string) =>
  z.object({
    [itemKey]: rawRecordArraySchema,
    pagination: paginationSchema
  });

export const resourceOutput = (idKey: string, resourceKey: string) =>
  z.object({
    [idKey]: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    [resourceKey]: rawRecordSchema
  });
