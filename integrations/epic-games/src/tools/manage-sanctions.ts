import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosGameServicesClient } from '../lib/client';
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
  displayName: z.string().optional().describe('Display name of the sanctioned player'),
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
              .describe('Duration in seconds. Omit for permanent sanctions.'),
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
      sanctions: z.array(sanctionSchema).describe('Resulting sanction records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosGameServicesClient({
      token: ctx.auth.token,
      deploymentId: ctx.config.deploymentId
    });

    let data: any;

    if (ctx.input.operation === 'create') {
      let createPayload = ctx.input.sanctions.map(s => ({
        productUserId: s.productUserId!,
        action: s.action!,
        justification: s.justification!,
        source: s.source!,
        duration: s.duration,
        tags: s.tags,
        pending: s.pending,
        metadata: s.metadata,
        displayName: s.displayName,
        identityProvider: s.identityProvider,
        accountId: s.accountId
      }));
      data = await client.createSanctions(createPayload);
    } else if (ctx.input.operation === 'update') {
      let updatePayload = ctx.input.sanctions.map(s => ({
        referenceId: s.referenceId!,
        updates: {
          tags: s.tags,
          metadata: s.metadata,
          justification: s.justification
        }
      }));
      data = await client.updateSanctions(updatePayload);
    } else {
      let referenceIds = ctx.input.sanctions.map(s => s.referenceId!);
      data = await client.removeSanctions(referenceIds);
    }

    let sanctions = data.elements ?? (Array.isArray(data) ? data : [data]);

    return {
      output: { sanctions },
      message: `Successfully **${ctx.input.operation}d** ${sanctions.length} sanction(s).`
    };
  })
  .build();
