import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

let broadcastOutputSchema = z.object({
  broadcastId: z.number().describe('Unique broadcast ID'),
  subject: z.string().describe('Email subject line'),
  previewText: z.string().nullable().describe('Preview text shown in inbox'),
  createdAt: z.string().describe('When the broadcast was created'),
  sendAt: z.string().nullable().describe('Scheduled send time'),
  publishedAt: z.string().nullable().describe('When the broadcast was published'),
  isPublic: z.boolean().describe('Whether the broadcast is public'),
  content: z.string().nullable().describe('HTML content of the broadcast')
});

export let manageBroadcasts = SlateTool.create(spec, {
  name: 'Manage Broadcasts',
  key: 'manage_broadcasts',
  description: `Create, update, delete, and list email broadcasts. Supports full HTML content, scheduling, subscriber segment targeting, and email template selection.`,
  instructions: [
    'Use sendAt (ISO 8601 format) to schedule a broadcast for future delivery.',
    'Use subscriberFilter to target specific subscriber segments.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      broadcastId: z
        .number()
        .optional()
        .describe('Broadcast ID (required for get, update, delete)'),
      subject: z.string().optional().describe('Email subject line'),
      content: z.string().optional().describe('HTML content of the email body'),
      previewText: z.string().optional().describe('Preview text shown in inbox'),
      description: z.string().optional().describe('Internal description of the broadcast'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether to make the broadcast publicly accessible'),
      sendAt: z.string().optional().describe('ISO 8601 datetime to schedule delivery'),
      emailTemplateId: z.number().optional().describe('ID of the email template to use'),
      subscriberFilter: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Subscriber segment filter rules')
    })
  )
  .output(
    z.object({
      broadcasts: z
        .array(broadcastOutputSchema)
        .optional()
        .describe('List of broadcasts (for list action)'),
      broadcast: broadcastOutputSchema
        .optional()
        .describe('Single broadcast (for get, create, update)'),
      deleted: z.boolean().optional().describe('Whether the broadcast was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapBroadcast = (b: any) => ({
      broadcastId: b.id,
      subject: b.subject,
      previewText: b.preview_text,
      createdAt: b.created_at,
      sendAt: b.send_at,
      publishedAt: b.published_at,
      isPublic: b.public,
      content: b.content
    });

    if (ctx.input.action === 'list') {
      let result = await client.listBroadcasts();
      let broadcasts = result.data.map(mapBroadcast);
      return {
        output: { broadcasts },
        message: `Found **${broadcasts.length}** broadcasts.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.broadcastId) {
        throw kitServiceError('Broadcast ID is required for get');
      }
      let data = await client.getBroadcast(ctx.input.broadcastId);
      return {
        output: { broadcast: mapBroadcast(data.broadcast) },
        message: `Retrieved broadcast **${data.broadcast.subject}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let data = await client.createBroadcast({
        subject: ctx.input.subject,
        content: ctx.input.content,
        description: ctx.input.description,
        previewText: ctx.input.previewText,
        public: ctx.input.isPublic,
        sendAt: ctx.input.sendAt,
        emailTemplateId: ctx.input.emailTemplateId,
        subscriberFilter: ctx.input.subscriberFilter
      });
      return {
        output: { broadcast: mapBroadcast(data.broadcast) },
        message: `Created broadcast **${data.broadcast.subject}**.${data.broadcast.send_at ? ` Scheduled for ${data.broadcast.send_at}.` : ''}`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.broadcastId) {
        throw kitServiceError('Broadcast ID is required for update');
      }
      let data = await client.updateBroadcast(ctx.input.broadcastId, {
        subject: ctx.input.subject,
        content: ctx.input.content,
        description: ctx.input.description,
        previewText: ctx.input.previewText,
        public: ctx.input.isPublic,
        sendAt: ctx.input.sendAt,
        emailTemplateId: ctx.input.emailTemplateId,
        subscriberFilter: ctx.input.subscriberFilter
      });
      return {
        output: { broadcast: mapBroadcast(data.broadcast) },
        message: `Updated broadcast **${data.broadcast.subject}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.broadcastId) {
        throw kitServiceError('Broadcast ID is required for delete');
      }
      await client.deleteBroadcast(ctx.input.broadcastId);
      return {
        output: { deleted: true },
        message: `Deleted broadcast \`${ctx.input.broadcastId}\`.`
      };
    }

    throw kitServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
