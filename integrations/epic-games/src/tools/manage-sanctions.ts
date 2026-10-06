import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { gameClient } from '../lib/client';
import { epicError, identifier, identifiers, whole } from '../lib/validation';
import { spec } from '../spec';

let sanctionSchema = z.object({
  referenceId: z.string().describe('Unique sanction reference ID'),
  productUserId: z.string().optional().describe("Sanctioned player's Product User ID"),
  action: z.string().describe('Sanction action type (e.g. "ban", "mute")'),
  justification: z.string().optional().describe('Reason for the sanction'),
  source: z.string().optional().describe('Source that created the sanction'),
  tags: z.array(z.string()).optional().describe('Tags associated with the sanction'),
  status: z
    .string()
    .optional()
    .describe('Sanction status (Active, Pending, Expired, Removed)'),
  pending: z.boolean().optional().describe('Whether the sanction is pending'),
  automated: z.boolean().optional().describe('Whether the sanction was automated'),
  timestamp: z.string().optional().describe('When the sanction was created (ISO 8601)'),
  expirationTimestamp: z
    .string()
    .nullable()
    .optional()
    .describe('When the sanction expires, or null if permanent'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom metadata key-value pairs'),
  displayName: z
    .string()
    .nullable()
    .optional()
    .describe('Display name of the sanctioned player'),
  deploymentId: z.string().optional().describe('Deployment ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

export let manageSanctions = SlateTool.create(spec, {
  name: 'Manage Sanctions',
  key: 'manage_sanctions',
  description: `Create, update, or remove player sanctions (bans, mutes, suspensions). Supports creating new sanctions with duration, updating existing sanction metadata/tags/justification, and removing sanctions by reference ID.
Use **create** to apply a new sanction, **update** to modify an existing one, or **remove** to lift sanctions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      sanctions: z
        .array(
          z.object({
            productUserId: z
              .string()
              .optional()
              .describe('Product User ID to sanction (required for create)'),
            referenceId: z
              .string()
              .optional()
              .describe('Sanction reference ID (required for update and remove)'),
            action: z
              .string()
              .optional()
              .describe('Sanction action type, e.g. "ban", "mute" (required for create)'),
            justification: z
              .string()
              .optional()
              .describe('Reason for the sanction (required for create, optional for update)'),
            source: z
              .string()
              .optional()
              .describe('Source identifier, e.g. "admin_panel" (required for create)'),
            duration: z
              .number()
              .optional()
              .describe(
                'Duration in seconds. Create accepts a whole number; updates require0 for permanent or 600–31536000 seconds. Omit to preserve the native default.'
              ),
            tags: z
              .array(z.string())
              .optional()
              .describe('Tags for categorizing the sanction'),
            pending: z.boolean().optional().describe('Whether the sanction is pending review'),
            metadata: z
              .record(z.string(), z.string())
              .optional()
              .describe('Custom key-value metadata (max 25 pairs)'),
            displayName: z.string().optional().describe('Display name of the player'),
            identityProvider: z
              .string()
              .optional()
              .describe('Identity provider of the player'),
            accountId: z.string().optional().describe('External account ID of the player')
          })
        )
        .min(1)
        .describe('Sanctions to create, update, or remove')
    })
  )
  .output(
    z.object({
      sanctions: z
        .array(sanctionSchema)
        .describe('Native created or updated records; removal returns no records.'),
      removedReferenceIds: z
        .array(z.string())
        .optional()
        .describe('Exact identifiers whose removal request was accepted.'),
      outcome: z
        .literal('accepted')
        .optional()
        .describe(
          'Provider accepted the operation; history and downstream effects may remain.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const required = (value: string | undefined, name: string) => {
      identifier(value, name);
      return value;
    };
    for (const row of ctx.input.sanctions) {
      if (ctx.input.operation === 'create') {
        required(row.productUserId, 'Product User ID');
        const action = required(row.action, 'Action'),
          source = required(row.source, 'Source');
        if (
          !/^[a-zA-Z0-9_-]{1,64}$/.test(action) ||
          !/^[a-zA-Z0-9_-]{2,64}$/.test(source) ||
          source.toLowerCase() === 'developer-portal'
        )
          throw createApiServiceError('Use a valid action and nonreserved source identifier.');
        required(row.justification, 'Justification');
        if (row.referenceId !== undefined)
          throw createApiServiceError('referenceId does not apply to create.');
      } else {
        required(row.referenceId, 'Sanction reference ID');
        if (
          [
            'productUserId',
            'action',
            'source',
            'pending',
            'displayName',
            'identityProvider',
            'accountId'
          ].some(key => row[key as keyof typeof row] !== undefined)
        )
          throw createApiServiceError(
            'Creation-only fields do not apply to update or remove.'
          );
        if (
          ctx.input.operation === 'remove' &&
          ['tags', 'metadata', 'duration'].some(
            key => row[key as keyof typeof row] !== undefined
          )
        )
          throw createApiServiceError(
            'Removal accepts referenceId and an optional common justification only.'
          );
        if (
          ctx.input.operation === 'update' &&
          [row.tags, row.metadata, row.justification, row.duration].every(
            value => value === undefined
          )
        )
          throw createApiServiceError('Supply an updatable sanction field.');
      }
      if (
        row.justification !== undefined &&
        (!row.justification.length || row.justification.length > 2048)
      )
        throw createApiServiceError('Justification requires 1–2048 characters.');
      if (
        row.tags &&
        (new Set(row.tags.map(tag => tag.toLowerCase())).size !== row.tags.length ||
          row.tags.some(tag => !/^[a-zA-Z0-9_-]{1,16}$/.test(tag)))
      )
        throw createApiServiceError(
          'Sanction tags must be unique without regard to case, with 1–16 letters, digits, underscores or hyphens.'
        );
      if (
        row.metadata &&
        (Object.keys(row.metadata).length > 25 ||
          Object.entries(row.metadata).some(
            ([key, value]) => key.length > 64 || value.length > 128
          ))
      )
        throw createApiServiceError(
          'Metadata supports up to 25 pairs, keys up to 64 characters and values up to 128 characters.'
        );
      for (const value of [row.displayName, row.identityProvider, row.accountId])
        if (value !== undefined && value.length > 64)
          throw createApiServiceError('Player metadata fields support at most 64 characters.');
      if (row.duration !== undefined) {
        whole(row.duration, 0, Number.MAX_SAFE_INTEGER, 'Duration');
        if (
          ctx.input.operation === 'update' &&
          row.duration !== 0 &&
          (row.duration < 600 || row.duration > 31536000)
        )
          throw createApiServiceError(
            'Updated duration must be 0 for permanent or 600–31536000 seconds.'
          );
      }
    }
    const client = gameClient(ctx);
    if (ctx.input.operation !== 'create')
      identifiers(
        ctx.input.sanctions.map(row => required(row.referenceId, 'Reference ID')),
        100,
        'Reference IDs'
      );
    try {
      if (ctx.input.operation === 'create') {
        const data = await client.createSanctions(
          ctx.input.sanctions.map(row => ({
            ...pickDefined({ ...row, referenceId: undefined }),
            productUserId: required(row.productUserId, 'Product User ID'),
            action: required(row.action, 'Action'),
            source: required(row.source, 'Source'),
            justification: required(row.justification, 'Justification')
          }))
        );
        return {
          output: { sanctions: data.elements, outcome: 'accepted' as const },
          message:
            'Epic accepted the sanctions and returned their exact receipts. Moderation effects and audit history may remain.'
        };
      }
      if (ctx.input.operation === 'update') {
        const data = await client.updateSanctions(
          ctx.input.sanctions.map(row => ({
            referenceId: required(row.referenceId, 'Reference ID'),
            updates: pickDefined({
              tags: row.tags,
              metadata: row.metadata,
              justification: row.justification,
              duration: row.duration
            })
          }))
        );
        return {
          output: { sanctions: data.elements, outcome: 'accepted' as const },
          message:
            'Epic returned the updated sanction receipts. Duration changes require independent expiry verification.'
        };
      }
      const reasons = [
        ...new Set(
          ctx.input.sanctions
            .map(row => row.justification)
            .filter(value => value !== undefined)
        )
      ];
      if (reasons.length > 1)
        throw createApiServiceError(
          'Removal supports one common justification for the batch.'
        );
      const data = await client.removeSanctions(
        ctx.input.sanctions.map(row => required(row.referenceId, 'Reference ID')),
        reasons[0]
      );
      return {
        output: {
          sanctions: data.elements,
          removedReferenceIds: data.removedReferenceIds,
          outcome: 'accepted' as const
        },
        message:
          'Epic accepted removal of the specified sanctions. This does not erase moderation or audit history.'
      };
    } catch (error) {
      const safe = epicError(error, true);
      safe.data.outcomeUncertain = true;
      throw safe;
    }
  })
  .build();
