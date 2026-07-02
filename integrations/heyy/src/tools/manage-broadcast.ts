import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBroadcastTool = SlateTool.create(spec, {
  name: 'Create Broadcast',
  key: 'create_broadcast',
  description: `Create a new broadcast campaign on a channel. Broadcasts allow you to send messages to many contacts at once for marketing outreach or re-engagement. You can schedule broadcasts, set recurrence, and include template variables.`,
  instructions: [
    'A workflowId is required — use the List Workflows tool or Trigger Workflow tool to find available workflow IDs.',
    'You can add up to 5000 contacts directly during creation.',
    'After creating a broadcast, add recipients and then start it.'
  ]
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID to create the broadcast on'),
      name: z.string().describe('Name of the broadcast'),
      workflowId: z.string().describe('Workflow ID to use for the broadcast'),
      messageTemplateId: z.string().optional().describe('Message template ID'),
      isScheduled: z.boolean().optional().describe('Whether the broadcast is scheduled'),
      scheduledAt: z.string().optional().describe('ISO datetime for scheduled delivery'),
      isReoccurring: z.boolean().optional().describe('Whether the broadcast is recurring'),
      recurrenceRules: z.array(z.string()).optional().describe('Recurrence rules'),
      variables: z
        .array(
          z.object({
            name: z.string().describe('Variable name'),
            value: z.string().describe('Variable value')
          })
        )
        .optional()
        .describe('Template variables')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().describe('Unique identifier of the created broadcast'),
      name: z.string().describe('Broadcast name'),
      workflowId: z.string().describe('Associated workflow ID'),
      status: z.string().describe('Broadcast status'),
      isScheduled: z.boolean().optional().describe('Whether scheduled'),
      scheduledAt: z.string().nullable().optional().describe('Scheduled delivery time'),
      createdAt: z.string().optional().describe('When the broadcast was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let broadcast = await client.createBroadcast(ctx.input.channelId, {
      name: ctx.input.name,
      workflowId: ctx.input.workflowId,
      messageTemplateId: ctx.input.messageTemplateId,
      isScheduled: ctx.input.isScheduled,
      scheduledAt: ctx.input.scheduledAt,
      isReoccurring: ctx.input.isReoccurring,
      recurrenceRules: ctx.input.recurrenceRules,
      variables: ctx.input.variables
    });

    return {
      output: {
        broadcastId: broadcast.id,
        name: broadcast.name,
        workflowId: broadcast.workflowId,
        status: broadcast.status,
        isScheduled: broadcast.isScheduled,
        scheduledAt: broadcast.scheduledAt ?? null,
        createdAt: broadcast.createdAt
      },
      message: `Created broadcast **${broadcast.name}** (${broadcast.id}) — status: **${broadcast.status}**.`
    };
  })
  .build();

export let listBroadcastsTool = SlateTool.create(spec, {
  name: 'List Broadcasts',
  key: 'list_broadcasts',
  description: `List all broadcast campaigns on a specific channel. Returns broadcast IDs, names, statuses, schedules, and workflow associations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID to list broadcasts for')
    })
  )
  .output(
    z.object({
      broadcasts: z
        .array(
          z.object({
            broadcastId: z.string().describe('Unique identifier of the broadcast'),
            name: z.string().describe('Broadcast name'),
            workflowId: z.string().optional().describe('Associated workflow ID'),
            status: z.string().describe('Broadcast status'),
            isScheduled: z.boolean().optional().describe('Whether scheduled'),
            scheduledAt: z.string().nullable().optional().describe('Scheduled delivery time'),
            createdAt: z.string().optional().describe('When the broadcast was created'),
            updatedAt: z.string().optional().describe('When the broadcast was last updated')
          })
        )
        .describe('List of broadcasts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBroadcasts(ctx.input.channelId);

    let broadcasts = (Array.isArray(result) ? result : (result?.broadcasts ?? [])).map(
      (b: any) => ({
        broadcastId: b.id,
        name: b.name,
        workflowId: b.workflowId,
        status: b.status,
        isScheduled: b.isScheduled,
        scheduledAt: b.scheduledAt ?? null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      })
    );

    return {
      output: { broadcasts },
      message: `Found **${broadcasts.length}** broadcast(s).`
    };
  })
  .build();

export let startBroadcastTool = SlateTool.create(spec, {
  name: 'Start Broadcast',
  key: 'start_broadcast',
  description: `Start a previously created broadcast campaign. Requires a media ID that was uploaded via the file upload tool. Once started, the broadcast will begin sending messages to its recipients.`
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID the broadcast belongs to'),
      broadcastId: z.string().describe('ID of the broadcast to start'),
      mediaId: z
        .string()
        .describe('Media ID (from file upload) required to start the broadcast')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().describe('ID of the started broadcast'),
      status: z.string().describe('Updated broadcast status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.startBroadcast(
      ctx.input.channelId,
      ctx.input.broadcastId,
      ctx.input.mediaId
    );

    return {
      output: {
        broadcastId: result.id,
        status: result.status
      },
      message: `Started broadcast **${result.id}** — status: **${result.status}**.`
    };
  })
  .build();

export let addBroadcastRecipientsTool = SlateTool.create(spec, {
  name: 'Add Broadcast Recipients',
  key: 'add_broadcast_recipients',
  description: `Add contacts as recipients to a broadcast campaign. Provide an array of contact IDs to add to the broadcast's recipient list.`
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID the broadcast belongs to'),
      broadcastId: z.string().describe('ID of the broadcast'),
      contactIds: z.array(z.string()).describe('Array of contact IDs to add as recipients')
    })
  )
  .output(
    z.object({
      recipients: z
        .array(
          z.object({
            recipientId: z.string().describe('Recipient record ID'),
            contactId: z.string().describe('Contact ID'),
            status: z.string().describe('Recipient status'),
            createdAt: z.string().optional().describe('When the recipient was added')
          })
        )
        .describe('Added recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addBroadcastRecipients(
      ctx.input.channelId,
      ctx.input.broadcastId,
      ctx.input.contactIds
    );

    let recipients = (Array.isArray(result) ? result : []).map((r: any) => ({
      recipientId: r.id,
      contactId: r.contactId,
      status: r.status,
      createdAt: r.createdAt
    }));

    return {
      output: { recipients },
      message: `Added **${recipients.length}** recipient(s) to broadcast **${ctx.input.broadcastId}**.`
    };
  })
  .build();
