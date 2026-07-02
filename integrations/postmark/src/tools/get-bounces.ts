import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBounces = SlateTool.create(spec, {
  name: 'Get Bounces',
  key: 'get_bounces',
  description: `Retrieve email bounce records from your Postmark server. Search and filter bounces by type, recipient, tag, date range, and message stream. Can also fetch delivery statistics with bounce type breakdowns, or reactivate a bounced email address.`,
  instructions: [
    'Set **action** to "list" to search bounces, "stats" for delivery stats summary, or "reactivate" to reactivate a specific bounced address.',
    'For reactivation, provide the **bounceId** of the bounce to reactivate.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'stats', 'reactivate'])
        .default('list')
        .describe('Action to perform.'),
      count: z
        .number()
        .min(1)
        .max(500)
        .default(50)
        .describe('Number of bounces to return (for "list" action).'),
      offset: z
        .number()
        .min(0)
        .default(0)
        .describe('Offset for pagination (for "list" action).'),
      bounceType: z
        .string()
        .optional()
        .describe(
          'Filter by bounce type (e.g., "HardBounce", "SoftBounce", "SpamComplaint").'
        ),
      inactive: z.boolean().optional().describe('Filter to only inactive recipients.'),
      emailFilter: z
        .string()
        .optional()
        .describe('Filter by recipient email address (partial match).'),
      tag: z.string().optional().describe('Filter by tag.'),
      fromDate: z.string().optional().describe('Start date (YYYY-MM-DD).'),
      toDate: z.string().optional().describe('End date (YYYY-MM-DD).'),
      messageStream: z.string().optional().describe('Filter by message stream ID.'),
      bounceId: z.number().optional().describe('Specific bounce ID for reactivation.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total matching bounces.'),
      bounces: z
        .array(
          z.object({
            bounceId: z.number().describe('Bounce record ID.'),
            type: z.string().describe('Bounce type classification.'),
            email: z.string().describe('Bounced recipient address.'),
            from: z.string().describe('Original sender.'),
            bouncedAt: z.string().describe('Timestamp of the bounce.'),
            subject: z.string().describe('Original email subject.'),
            inactive: z.boolean().describe('Whether the address was deactivated.'),
            canActivate: z.boolean().describe('Whether the address can be reactivated.'),
            messageStream: z.string().describe('Message stream ID.'),
            description: z.string().describe('Bounce description.')
          })
        )
        .optional()
        .describe('List of bounce records.'),
      inactiveMails: z.number().optional().describe('Total inactive email count (for stats).'),
      bounceStats: z
        .array(
          z.object({
            type: z.string().describe('Bounce type.'),
            name: z.string().describe('Bounce type name.'),
            count: z.number().describe('Number of bounces of this type.')
          })
        )
        .optional()
        .describe('Bounce type breakdown (for stats).'),
      reactivated: z
        .boolean()
        .optional()
        .describe('Whether the bounce was successfully reactivated.'),
      reactivationMessage: z.string().optional().describe('Reactivation status message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.action === 'stats') {
      let stats = await client.getDeliveryStats();
      return {
        output: {
          inactiveMails: stats.InactiveMails,
          bounceStats: stats.Bounces.map(b => ({
            type: b.Type,
            name: b.Name,
            count: b.Count
          }))
        },
        message: `Delivery stats: **${stats.InactiveMails}** inactive mails, **${stats.Bounces.length}** bounce types recorded.`
      };
    }

    if (ctx.input.action === 'reactivate') {
      if (!ctx.input.bounceId) {
        throw new Error('bounceId is required for reactivation');
      }
      let result = await client.activateBounce(ctx.input.bounceId);
      return {
        output: {
          reactivated: true,
          reactivationMessage: result.Message
        },
        message: `Bounce **${ctx.input.bounceId}** reactivated: ${result.Message}`
      };
    }

    let result = await client.getBounces({
      count: ctx.input.count,
      offset: ctx.input.offset,
      type: ctx.input.bounceType,
      inactive: ctx.input.inactive,
      emailFilter: ctx.input.emailFilter,
      tag: ctx.input.tag,
      fromdate: ctx.input.fromDate,
      todate: ctx.input.toDate,
      messageStream: ctx.input.messageStream
    });

    return {
      output: {
        totalCount: result.TotalCount,
        bounces: result.Bounces.map(b => ({
          bounceId: b.ID,
          type: b.Type,
          email: b.Email,
          from: b.From,
          bouncedAt: b.BouncedAt,
          subject: b.Subject,
          inactive: b.Inactive,
          canActivate: b.CanActivate,
          messageStream: b.MessageStream,
          description: b.Description
        }))
      },
      message: `Found **${result.TotalCount}** bounces (showing ${result.Bounces.length}).`
    };
  });
