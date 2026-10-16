import { z } from 'zod';

export let purchaseOptionsShape = {
  fundedByName: z
    .string()
    .optional()
    .describe('Optional funded-by label. This label is visible on public Ecologi profiles.'),
  testMode: z
    .boolean()
    .optional()
    .describe('Simulate the purchase without charges, profile changes, or recipient emails.'),
  recipientEmail: z
    .email()
    .optional()
    .describe('Optional recipient to notify about the purchase. Omit to send no email.'),
  idempotencyKey: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Unique request key. Reuse the same key when retrying the same purchase.')
};

export let purchaseDetailsShape = {
  name: z.string().optional().describe('The funded-by label returned by Ecologi.'),
  projectDetails: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('The projects supported by this purchase and their allocated quantities.'),
  recipientEmail: z.string().optional().describe('The recipient email returned by Ecologi.'),
  raw: z.record(z.string(), z.unknown()).describe('The complete response from Ecologi.')
};
