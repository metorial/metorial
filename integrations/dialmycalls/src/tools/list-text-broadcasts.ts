import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTextBroadcasts = SlateTool.create(spec, {
  name: 'List Text Broadcasts',
  key: 'list_text_broadcasts',
  description: `Retrieve SMS/MMS text broadcasts from your account. Optionally fetch a specific broadcast by ID or get recipients for a broadcast to check delivery statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      broadcastId: z
        .string()
        .optional()
        .describe(
          'Fetch a specific text broadcast by ID. If omitted, lists all text broadcasts.'
        ),
      includeRecipients: z
        .boolean()
        .optional()
        .describe(
          'If true and broadcastId is provided, also returns the recipient list with delivery statuses.'
        ),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      broadcasts: z
        .array(
          z.object({
            broadcastId: z.string().optional(),
            name: z.string().optional(),
            creditCost: z.number().optional(),
            totalRecipients: z.number().optional(),
            sendAt: z.string().optional(),
            pendingCancel: z.boolean().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      recipients: z
        .array(
          z.object({
            phone: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            status: z
              .string()
              .optional()
              .describe(
                'Delivery status: delivered, undeliverable, enroute, unknown, non_mobile, queued'
              ),
            successful: z.boolean().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.broadcastId) {
      let broadcast = await client.getText(ctx.input.broadcastId);
      let recipients:
        | Array<{
            phone?: string;
            firstName?: string;
            lastName?: string;
            email?: string;
            status?: string;
            successful?: boolean;
          }>
        | undefined;

      if (ctx.input.includeRecipients) {
        let rawRecipients = await client.getTextRecipients(
          ctx.input.broadcastId,
          ctx.input.range
        );
        recipients = rawRecipients.map(r => ({
          phone: r.phone,
          firstName: r.firstname,
          lastName: r.lastname,
          email: r.email,
          status: r.status,
          successful: r.successful
        }));
      }

      return {
        output: {
          broadcasts: [
            {
              broadcastId: broadcast.id,
              name: broadcast.name,
              creditCost: broadcast.credit_cost,
              totalRecipients: broadcast.total_recipients,
              sendAt: broadcast.send_at,
              pendingCancel: broadcast.pending_cancel,
              createdAt: broadcast.created_at,
              updatedAt: broadcast.updated_at
            }
          ],
          recipients
        },
        message: `Retrieved text broadcast **${broadcast.name}**${recipients ? ` with **${recipients.length}** recipient(s)` : ''}.`
      };
    }

    let rawBroadcasts = await client.listTexts(ctx.input.range);
    let broadcasts = rawBroadcasts.map(b => ({
      broadcastId: b.id,
      name: b.name,
      creditCost: b.credit_cost,
      totalRecipients: b.total_recipients,
      sendAt: b.send_at,
      pendingCancel: b.pending_cancel,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));

    return {
      output: { broadcasts },
      message: `Retrieved **${broadcasts.length}** text broadcast(s).`
    };
  })
  .build();
