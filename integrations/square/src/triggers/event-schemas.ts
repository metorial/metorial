import { z } from 'zod';

const nonempty = z.string().trim().min(1);
const httpsUrl = z
  .string()
  .url()
  .refine(value => new URL(value).protocol === 'https:');

export const squareRegistrationInputSchema = z
  .object({
    applicationId: nonempty.describe(
      'Application ID from this Square application in the Developer Console'
    ),
    environment: z
      .enum(['production', 'sandbox'])
      .describe('The environment selected for this Square application'),
    signatureKey: nonempty.describe(
      'Signature key for this webhook subscription in the Square Developer Console'
    )
  })
  .strict();

export const squareRegistrationSchema = squareRegistrationInputSchema
  .extend({
    notificationUrl: httpsUrl.describe(
      'The exact URL registered in Square for this subscription'
    )
  })
  .strict();

// The published Square event examples use these fields; passthrough preserves the complete
// current resource snapshot for each family, including fields added by later API versions.
// https://developer.squareup.com/reference/square/webhooks
export const squareEventEnvelopeSchema = z
  .object({
    merchant_id: nonempty,
    type: nonempty,
    event_id: nonempty,
    created_at: nonempty,
    data: z
      .object({
        type: nonempty,
        id: nonempty,
        object: z.record(z.string(), z.unknown()).optional(),
        deleted: z.boolean().optional()
      })
      .loose()
      .refine(data => data.object !== undefined || data.deleted === true)
  })
  .loose();

export type SquareEventEnvelope = z.infer<typeof squareEventEnvelopeSchema>;
