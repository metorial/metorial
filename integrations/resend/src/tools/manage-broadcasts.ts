import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let broadcastOutputSchema = z.object({
  broadcastId: z.string().describe('ID of the broadcast.'),
  name: z.string().optional().nullable().describe('Internal broadcast name.'),
  segmentId: z.string().optional().describe('Target segment ID.'),
  from: z.string().optional().describe('Sender address.'),
  subject: z.string().optional().describe('Email subject.'),
  replyTo: z.string().optional().nullable().describe('Reply-to address.'),
  html: z.string().optional().nullable().describe('HTML content.'),
  text: z.string().optional().nullable().describe('Plain text content.'),
  status: z.string().optional().describe('Broadcast status (draft, queued, sent).'),
  createdAt: z.string().optional().describe('Creation timestamp.'),
  scheduledAt: z.string().optional().nullable().describe('Scheduled delivery time.'),
  sentAt: z.string().optional().nullable().describe('When the broadcast was sent.'),
  topicId: z.string().optional().nullable().describe('Topic ID for scoping.')
});

export let createBroadcast = SlateTool.create(spec, {
  name: 'Create Broadcast',
  key: 'create_broadcast',
  description: `Create a broadcast campaign to send to a segment of contacts. Can be sent immediately, scheduled, or saved as a draft. Broadcasts handle unsubscribe flows automatically.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('Target segment ID to send to.'),
      from: z.string().describe('Sender email address.'),
      subject: z.string().describe('Email subject line.'),
      html: z
        .string()
        .optional()
        .describe('HTML content. Supports contact property variables.'),
      text: z.string().optional().describe('Plain text content.'),
      replyTo: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Reply-to address(es).'),
      name: z.string().optional().describe('Internal name for the broadcast.'),
      topicId: z
        .string()
        .optional()
        .describe('Scope to a specific topic for subscription management.'),
      send: z
        .boolean()
        .optional()
        .describe('Set to true to send immediately. Default is false (draft).'),
      scheduledAt: z
        .string()
        .optional()
        .describe('Schedule time (ISO 8601 or natural language). Requires send: true.')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().describe('ID of the created broadcast.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBroadcast({
      segmentId: ctx.input.segmentId,
      from: ctx.input.from,
      subject: ctx.input.subject,
      html: ctx.input.html,
      text: ctx.input.text,
      replyTo: ctx.input.replyTo,
      name: ctx.input.name,
      topicId: ctx.input.topicId,
      send: ctx.input.send,
      scheduledAt: ctx.input.scheduledAt
    });

    let status = ctx.input.send ? 'sent/queued' : 'draft';
    return {
      output: { broadcastId: result.id },
      message: `Broadcast created as **${status}** with ID \`${result.id}\`.`
    };
  })
  .build();

export let getBroadcast = SlateTool.create(spec, {
  name: 'Get Broadcast',
  key: 'get_broadcast',
  description: `Retrieve details of a broadcast campaign including status, content, and delivery information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      broadcastId: z.string().describe('ID of the broadcast to retrieve.')
    })
  )
  .output(broadcastOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let b = await client.getBroadcast(ctx.input.broadcastId);

    return {
      output: {
        broadcastId: b.id,
        name: b.name,
        segmentId: b.segment_id,
        from: b.from,
        subject: b.subject,
        replyTo: b.reply_to,
        html: b.html,
        text: b.text,
        status: b.status,
        createdAt: b.created_at,
        scheduledAt: b.scheduled_at,
        sentAt: b.sent_at,
        topicId: b.topic_id
      },
      message: `Broadcast **${b.name || b.id}** — status: **${b.status}**.`
    };
  })
  .build();

export let updateBroadcast = SlateTool.create(spec, {
  name: 'Update Broadcast',
  key: 'update_broadcast',
  description: `Update draft broadcast content, sender, subject, or internal name before it is sent.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      broadcastId: z.string().describe('ID of the draft broadcast to update.'),
      from: z.string().optional().describe('Updated sender email address.'),
      subject: z.string().optional().describe('Updated email subject line.'),
      html: z.string().optional().describe('Updated HTML content.'),
      text: z.string().optional().describe('Updated plain text content.'),
      name: z.string().optional().describe('Updated internal broadcast name.')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().describe('ID of the updated broadcast.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateBroadcast(ctx.input.broadcastId, {
      from: ctx.input.from,
      subject: ctx.input.subject,
      html: ctx.input.html,
      text: ctx.input.text,
      name: ctx.input.name
    });

    return {
      output: { broadcastId: result.id },
      message: `Broadcast \`${result.id}\` updated.`
    };
  })
  .build();

export let sendBroadcast = SlateTool.create(spec, {
  name: 'Send Broadcast',
  key: 'send_broadcast',
  description: `Send a draft broadcast immediately or schedule it for later. Only broadcasts created via the API can be sent with this tool.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      broadcastId: z.string().describe('ID of the broadcast to send.'),
      scheduledAt: z
        .string()
        .optional()
        .describe('Schedule time (ISO 8601 or natural language). Omit to send immediately.')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().describe('ID of the broadcast.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendBroadcast(ctx.input.broadcastId, {
      scheduledAt: ctx.input.scheduledAt
    });

    let action = ctx.input.scheduledAt ? `scheduled for ${ctx.input.scheduledAt}` : 'sent';
    return {
      output: { broadcastId: result.id },
      message: `Broadcast \`${result.id}\` has been **${action}**.`
    };
  })
  .build();

export let listBroadcasts = SlateTool.create(spec, {
  name: 'List Broadcasts',
  key: 'list_broadcasts',
  description: `List all broadcast campaigns with their status and delivery timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      broadcasts: z
        .array(
          z.object({
            broadcastId: z.string().describe('Broadcast ID.'),
            segmentId: z.string().optional().describe('Target segment.'),
            status: z.string().optional().describe('Current status.'),
            createdAt: z.string().optional().describe('Creation timestamp.'),
            scheduledAt: z.string().optional().nullable().describe('Scheduled time.'),
            sentAt: z.string().optional().nullable().describe('Send time.')
          })
        )
        .describe('List of broadcasts.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBroadcasts({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let broadcasts = (result.data || []).map((b: any) => ({
      broadcastId: b.id,
      segmentId: b.segment_id,
      status: b.status,
      createdAt: b.created_at,
      scheduledAt: b.scheduled_at,
      sentAt: b.sent_at
    }));

    return {
      output: {
        broadcasts,
        hasMore: result.has_more ?? false
      },
      message: `Found **${broadcasts.length}** broadcast(s).`
    };
  })
  .build();

export let deleteBroadcast = SlateTool.create(spec, {
  name: 'Delete Broadcast',
  key: 'delete_broadcast',
  description: `Delete a draft broadcast. Only broadcasts with "draft" status can be deleted. Scheduled deliveries are auto-cancelled.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      broadcastId: z.string().describe('ID of the broadcast to delete.')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().describe('ID of the deleted broadcast.'),
      deleted: z.boolean().describe('Whether the broadcast was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteBroadcast(ctx.input.broadcastId);

    return {
      output: {
        broadcastId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Broadcast \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
