import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let deliverySchema = z.object({
  deliveryId: z.string().describe('Chameleon delivery ID'),
  modelId: z.string().optional().describe('Experience ID'),
  modelKind: z.string().optional().describe('Experience type: tour or survey'),
  profileId: z.string().optional().describe('User profile ID'),
  from: z.string().nullable().optional().describe('Earliest delivery time'),
  until: z.string().nullable().optional().describe('Latest delivery time'),
  at: z.string().nullable().optional().describe('Actual trigger time'),
  atHref: z.string().optional().describe('Page URL where triggered'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageDeliveries = SlateTool.create(spec, {
  name: 'Manage Deliveries',
  key: 'manage_deliveries',
  description: `Create, list, or delete experience deliveries in Chameleon.
Deliveries trigger tours or microsurveys directly to specific users with configurable time windows.
Use this to schedule or send experiences to individual users on demand.`,
  instructions: [
    'Provide a user via profileId, uid, or email when creating a delivery.',
    'Triggered deliveries (those with an "at" timestamp) cannot be updated or deleted.',
    'Maximum 3 pending deliveries per user by default.'
  ],
  constraints: [
    'Maximum 3 pending deliveries per user (adjustable via deliveryIdsLimit).',
    'Cannot delete or update already-triggered deliveries.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      deliveryId: z.string().optional().describe('Delivery ID (for delete action)'),
      // List params
      modelId: z.string().optional().describe('Filter deliveries by experience ID'),
      profileId: z
        .string()
        .optional()
        .describe('Filter deliveries by user profile ID, or target user for create'),
      limit: z.number().min(1).max(500).optional().describe('Number of deliveries to return'),
      before: z.string().optional().describe('Pagination cursor'),
      after: z.string().optional().describe('Pagination cursor'),
      // Create params
      uid: z.string().optional().describe('External user identifier for create'),
      email: z.string().optional().describe('User email for create'),
      modelKind: z.enum(['tour', 'survey']).optional().describe('Experience type for create'),
      experienceId: z.string().optional().describe('Experience ID for create'),
      idempotencyKey: z.string().optional().describe('Prevents duplicate deliveries'),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom data for merge tags'),
      from: z.string().optional().describe('Earliest delivery time (ISO8601)'),
      until: z
        .string()
        .optional()
        .describe('Latest delivery time (ISO8601 or interval like "+30d")'),
      useSegmentation: z.boolean().optional().describe('Apply audience filters'),
      once: z
        .boolean()
        .optional()
        .describe('Only deliver if user has not previously seen this experience'),
      skipTriggers: z
        .boolean()
        .optional()
        .describe('Bypass first-step triggers (default true)'),
      skipUrlMatch: z.boolean().optional().describe('Bypass URL matching (default true)')
    })
  )
  .output(
    z.object({
      delivery: deliverySchema.optional().describe('Created or retrieved delivery'),
      deliveries: z
        .array(deliverySchema)
        .optional()
        .describe('Array of deliveries (for list action)'),
      deleted: z.boolean().optional().describe('Whether the delivery was deleted'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    let mapDelivery = (d: Record<string, unknown>) => ({
      deliveryId: d.id as string,
      modelId: d.model_id as string | undefined,
      modelKind: d.model_kind as string | undefined,
      profileId: d.profile_id as string | undefined,
      from: d.from as string | null | undefined,
      until: d.until as string | null | undefined,
      at: d.at as string | null | undefined,
      atHref: d.at_href as string | undefined,
      createdAt: d.created_at as string | undefined,
      updatedAt: d.updated_at as string | undefined
    });

    if (ctx.input.action === 'list') {
      let result = await client.listDeliveries({
        modelId: ctx.input.modelId,
        profileId: ctx.input.profileId,
        limit: ctx.input.limit,
        before: ctx.input.before,
        after: ctx.input.after
      });
      let deliveries = (result.deliveries || []).map(mapDelivery);
      return {
        output: { deliveries, cursor: result.cursor },
        message: `Returned **${deliveries.length}** deliveries.`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createDelivery({
        profileId: ctx.input.profileId,
        uid: ctx.input.uid,
        email: ctx.input.email,
        modelKind: ctx.input.modelKind!,
        modelId: ctx.input.experienceId!,
        idempotencyKey: ctx.input.idempotencyKey,
        options: ctx.input.options,
        from: ctx.input.from,
        until: ctx.input.until,
        useSegmentation: ctx.input.useSegmentation,
        once: ctx.input.once,
        skipTriggers: ctx.input.skipTriggers,
        skipUrlMatch: ctx.input.skipUrlMatch
      });
      return {
        output: { delivery: mapDelivery(result) },
        message: `Created delivery **${result.id}** for ${ctx.input.modelKind} experience.`
      };
    }

    // delete
    await client.deleteDelivery(ctx.input.deliveryId!);
    return {
      output: { deleted: true },
      message: `Delivery **${ctx.input.deliveryId}** has been deleted.`
    };
  })
  .build();
