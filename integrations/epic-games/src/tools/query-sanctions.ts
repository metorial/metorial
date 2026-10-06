import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { gameClient } from '../lib/client';
import { pagingSchema } from '../lib/types';
import { whole } from '../lib/validation';
import { spec } from '../spec';

let sanctionSchema = z.object({
  referenceId: z.string().describe('Unique sanction reference ID'),
  productUserId: z.string().optional().describe("Sanctioned player's Product User ID"),
  action: z.string().describe('Sanction action type'),
  justification: z.string().optional().describe('Reason for the sanction'),
  source: z.string().optional().describe('Source that created the sanction'),
  tags: z.array(z.string()).optional().describe('Tags associated with the sanction'),
  status: z.string().optional().describe('Sanction status'),
  pending: z.boolean().optional().describe('Whether the sanction is pending'),
  automated: z.boolean().optional().describe('Whether the sanction was automated'),
  timestamp: z.string().optional().describe('When the sanction was created'),
  expirationTimestamp: z
    .string()
    .nullable()
    .optional()
    .describe('When the sanction expires, or null if permanent'),
  metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
  displayName: z.string().nullable().optional().describe('Player display name'),
  deploymentId: z.string().optional().describe('Deployment ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

export let querySanctions = SlateTool.create(spec, {
  name: 'Query Sanctions',
  key: 'query_sanctions',
  description: `Query player sanctions for your deployment. Can retrieve all sanctions, sanctions for a specific player, or only active sanctions for one or more players.
Supports pagination and filtering by action type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productUserId: z
        .string()
        .optional()
        .describe('Filter sanctions for a specific Product User ID'),
      activeOnly: z
        .boolean()
        .default(false)
        .describe('If true, only return currently active sanctions'),
      actions: z
        .array(z.string())
        .max(5)
        .optional()
        .describe('Filter by sanction action types (e.g. ["ban", "mute"])'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(100)
        .describe('Maximum number of results to return'),
      offset: z.number().min(0).default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      sanctions: z.array(sanctionSchema).describe('Sanction records matching the query'),
      paging: pagingSchema.optional().describe('Verified pagination metadata.'),
      pagination: z
        .enum(['native', 'local'])
        .optional()
        .describe('Native offset page or local slice of an active snapshot.'),
      total: z
        .number()
        .optional()
        .describe('Total number of matching sanctions (when pagination is available)')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.activeOnly && !ctx.input.productUserId)
      throw createApiServiceError('activeOnly requires one Product User ID.');
    if (ctx.input.actions?.length && !ctx.input.activeOnly)
      throw createApiServiceError(
        'Action filtering is supported only with activeOnly and one Product User ID.'
      );
    whole(ctx.input.limit, 1, 100, 'Limit');
    whole(ctx.input.offset, 0, Number.MAX_SAFE_INTEGER, 'Offset');
    const client = gameClient(ctx);
    if (ctx.input.activeOnly) {
      const data = await client.getActiveSanctionsForPlayer(
        ctx.input.productUserId!,
        ctx.input.actions
      );
      const sanctions = data.elements.slice(
        ctx.input.offset,
        ctx.input.offset + ctx.input.limit
      );
      return {
        output: {
          sanctions,
          total: data.elements.length,
          paging: {
            offset: ctx.input.offset,
            limit: ctx.input.limit,
            total: data.elements.length
          },
          pagination: 'local' as const
        },
        message: 'Returned a local slice of the native active-sanction snapshot.'
      };
    }
    const data = ctx.input.productUserId
      ? await client.queryPlayerSanctions(
          ctx.input.productUserId,
          ctx.input.limit,
          ctx.input.offset
        )
      : await client.querySanctions(ctx.input.limit, ctx.input.offset);
    return {
      output: {
        sanctions: data.elements,
        total: data.paging.total,
        paging: data.paging,
        pagination: 'native' as const
      },
      message:
        'Returned one native sanction page. Continue with offset plus limit while records remain.'
    };
  })
  .build();
