import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

export let manageIncomingLeadTool = SlateTool.create(spec, {
  name: 'Manage Incoming Lead',
  key: 'manage_incoming_lead',
  description:
    'Accept an incoming lead into the sales pipeline or decline it. Call list_incoming_leads first to discover its UID. Declining removes it from the incoming queue.',
  tags: { destructive: true },
  instructions: [
    'Use statusId only when accepting. Call list_pipelines to find a destination stage and list_users to find a user ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['accept', 'decline']).describe('Action to perform on the incoming lead'),
      uid: z.string().min(1).describe('Incoming lead UID from list_incoming_leads'),
      userId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'User ID from list_users; lead creator when accepting or acting user when declining'
        ),
      statusId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Destination stage ID from list_pipelines, used only for accept')
    })
  )
  .output(
    z.object({
      uid: z.string(),
      action: z.enum(['accept', 'decline']),
      leadIds: z.array(z.number()).describe('Lead IDs returned by Kommo'),
      contactIds: z.array(z.number()).describe('Contact IDs returned by Kommo'),
      companyIds: z.array(z.number()).describe('Company IDs returned by Kommo')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'decline' && ctx.input.statusId !== undefined) {
      throw createApiServiceError(
        'statusId is only supported when accepting an incoming lead.'
      );
    }
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || (ctx.config as { subdomain?: string }).subdomain
    });
    let data = ctx.input.userId === undefined ? {} : { user_id: ctx.input.userId };
    let result =
      ctx.input.action === 'accept'
        ? await client.acceptIncomingLead(ctx.input.uid, {
            ...data,
            ...(ctx.input.statusId === undefined ? {} : { status_id: ctx.input.statusId })
          })
        : await client.declineIncomingLead(ctx.input.uid, data);
    return {
      output: {
        uid: ctx.input.uid,
        action: ctx.input.action,
        leadIds: (result?._embedded?.leads || []).map((record: { id: number }) => record.id),
        contactIds: (result?._embedded?.contacts || []).map(
          (record: { id: number }) => record.id
        ),
        companyIds: (result?._embedded?.companies || []).map(
          (record: { id: number }) => record.id
        )
      },
      message: `${ctx.input.action === 'accept' ? 'Accepted' : 'Declined'} incoming lead **${ctx.input.uid}**.`
    };
  })
  .build();
