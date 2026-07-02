import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSuggestionStatus = SlateTool.create(spec, {
  name: 'Update Suggestion Status',
  key: 'update_suggestion_status',
  description: `Change the status of a suggestion and optionally notify supporters. Creates a status update record that closes the feedback loop with customers. Use **List Statuses** to find available status IDs.`,
  instructions: [
    'Use the "List Statuses" tool first to find valid status IDs for your account.'
  ]
})
  .input(
    z.object({
      suggestionId: z.number().describe('ID of the suggestion to update'),
      statusId: z.number().describe('ID of the new status to set'),
      body: z.string().optional().describe('Message to include with the status update'),
      notifySupporters: z
        .boolean()
        .optional()
        .describe('Whether to email supporters about this status change (default: false)')
    })
  )
  .output(
    z.object({
      statusUpdateId: z.number().describe('ID of the created status update'),
      suggestionId: z.number().describe('ID of the suggestion'),
      newStatusId: z.number().describe('ID of the new status'),
      body: z.string().nullable().describe('Status update message'),
      createdAt: z.string().describe('When the status update was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let statusUpdate = await client.createStatusUpdate(ctx.input.suggestionId, {
      statusId: ctx.input.statusId,
      body: ctx.input.body,
      notifySupporters: ctx.input.notifySupporters
    });

    return {
      output: {
        statusUpdateId: statusUpdate.id,
        suggestionId: ctx.input.suggestionId,
        newStatusId: ctx.input.statusId,
        body: statusUpdate.body || null,
        createdAt: statusUpdate.created_at
      },
      message: `Updated status of suggestion ${ctx.input.suggestionId} to status ${ctx.input.statusId}.${ctx.input.notifySupporters ? ' Supporters were notified.' : ''}`
    };
  })
  .build();
