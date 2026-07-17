import { SlateTool } from 'slates';
import { z } from 'zod';
import { isRecord, jsonApiBody, type NaturalRecord } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
import { requireConfirm, requireIdempotencyKey } from '../lib/validation';
import { spec } from '../spec';
import { confirmSchema, idempotencyKeySchema, rawRecordSchema } from './schemas';
import { createClient } from './shared';

const isUriEncodable = (value: string) => {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const agentKeyIdSchema = z
  .string()
  .min(5, 'Agent key IDs require a non-empty value after agk_.')
  .startsWith('agk_', 'Agent key IDs use the agk_ prefix.')
  .refine(isUriEncodable, 'Natural agent key ID must be well-formed Unicode.');

const relationshipSchema = (type: 'party' | 'agent') =>
  z
    .object({
      data: z
        .object({
          type: z.literal(type),
          id: z.string().min(1)
        })
        .passthrough()
    })
    .passthrough();

const rotateAgentKeySuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('agentKey'),
        id: z.string().min(1),
        attributes: z
          .object({
            agentKeyPrefix: z.string().min(1),
            status: z.enum(['ACTIVE', 'REVOKED']),
            createdAt: z.string().datetime({ offset: true }),
            lastUsedAt: z.string().datetime({ offset: true }).nullable(),
            revokedAt: z.string().datetime({ offset: true }).nullable(),
            createdBy: z.string().nullable(),
            revokedBy: z.string().nullable(),
            expiresAt: z.string().datetime({ offset: true }).nullable(),
            agentKey: z.string().min(1),
            previousKeyExpiresAt: z.string().datetime({ offset: true }).nullable()
          })
          .passthrough(),
        relationships: z
          .object({
            party: relationshipSchema('party'),
            agent: relationshipSchema('agent')
          })
          .passthrough()
      })
      .passthrough(),
    meta: rawRecordSchema.optional()
  })
  .passthrough();

const redactAgentKeyFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactAgentKeyFields);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'agentKey')
      .map(([key, item]) => [key, redactAgentKeyFields(item)])
  );
};

const redactAgentKeyRecord = (value: NaturalRecord) =>
  redactAgentKeyFields(value) as NaturalRecord;

export const rotateAgentKey = SlateTool.create(spec, {
  name: 'Rotate Agent Key',
  key: 'rotate_agent_key',
  description:
    'Rotate a Natural agent key and return the one-time replacement secret only in output.agentKey, together with its complete lifecycle and ownership metadata. Requires confirmation and an idempotency key; reuse the same key when retrying the same rotation.',
  constraints: [
    'The replacement agent key secret is returned only once and cannot be retrieved later.',
    'The previous key remains valid for expiresInSeconds, up to 24 hours; 0 means immediate cutover.',
    'Store and deploy the replacement secret before the previous key expires.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      keyId: agentKeyIdSchema.describe(
        'Natural agent key ID with an agk_ prefix and non-empty opaque suffix.'
      ),
      expiresInSeconds: z
        .number()
        .int()
        .min(0)
        .max(86400)
        .describe(
          'Grace period in seconds for the previous key. 0 means immediate cutover; the maximum is 86400 (24 hours).'
        ),
      idempotencyKey: idempotencyKeySchema
        .max(255)
        .describe(
          'Natural Idempotency-Key header, at most 255 characters. Reuse the same key when retrying this rotation.'
        ),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().min(1).describe('Rotated Natural agent key ID.'),
      type: z.literal('agentKey').describe('Natural resource type.'),
      status: z.enum(['ACTIVE', 'REVOKED']).describe('Current replacement key status.'),
      agentKeyPrefix: z
        .string()
        .min(1)
        .describe('Non-secret prefix that identifies the replacement agent key.'),
      createdAt: z.string().datetime({ offset: true }).describe('When this key was created.'),
      lastUsedAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('When this key was last used, or null if it has not been used.'),
      revokedAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('When this key was revoked, or null while it is active.'),
      createdBy: z
        .string()
        .nullable()
        .describe('Natural user ID that created this key, when available.'),
      revokedBy: z
        .string()
        .nullable()
        .describe('Natural user ID that revoked this key, or null while active.'),
      expiresAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('When the replacement key expires, or null when it does not expire.'),
      previousKeyExpiresAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('When the previous key stops authenticating; null means immediate cutover.'),
      partyId: z.string().min(1).describe('Natural party ID that owns the agent key.'),
      agentId: z.string().min(1).describe('Natural agent ID the key is bound to.'),
      relationships: rawRecordSchema.describe('Raw Natural relationship metadata.'),
      agentKey: z
        .string()
        .min(1)
        .describe('One-time replacement Natural agent key secret. Store it securely.'),
      key: rawRecordSchema.describe(
        'Raw non-secret Natural agent key resource, including additive metadata.'
      ),
      meta: rawRecordSchema
        .optional()
        .describe('Raw non-secret Natural response metadata, when returned.')
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'rotate this agent key');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'rotate an agent key');

    const client = createClient(ctx);
    const envelope = await client.request(
      'rotate agent key',
      'post',
      `/agent-keys/${encodeURIComponent(ctx.input.keyId)}/rotate`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody({ expiresInSeconds: ctx.input.expiresInSeconds })
      }
    );
    const response = rotateAgentKeySuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when rotating the agent key. Verify the agent key state in Natural before retrying, and reuse the same idempotency key to safely recover the original one-time secret.',
        'natural_response_error'
      );
    }

    if (response.data.data.id !== ctx.input.keyId) {
      throw naturalServiceError(
        'Natural returned a different agent key than the one requested when rotating it. Verify the agent key state in Natural before retrying, and reuse the same idempotency key to safely recover the original one-time secret.',
        'natural_response_error'
      );
    }

    const resource = response.data.data;
    const { attributes, relationships } = resource;
    const output = {
      keyId: resource.id,
      type: resource.type,
      status: attributes.status,
      agentKeyPrefix: attributes.agentKeyPrefix,
      createdAt: attributes.createdAt,
      lastUsedAt: attributes.lastUsedAt,
      revokedAt: attributes.revokedAt,
      createdBy: attributes.createdBy,
      revokedBy: attributes.revokedBy,
      expiresAt: attributes.expiresAt,
      previousKeyExpiresAt: attributes.previousKeyExpiresAt,
      partyId: relationships.party.data.id,
      agentId: relationships.agent.data.id,
      relationships: redactAgentKeyRecord(relationships),
      agentKey: attributes.agentKey,
      key: redactAgentKeyRecord(resource),
      ...(response.data.meta === undefined
        ? {}
        : { meta: redactAgentKeyRecord(response.data.meta) })
    };

    return {
      output,
      message: `Rotated agent key **${ctx.input.keyId}**. Store the returned replacement secret securely.`
    };
  })
  .build();
