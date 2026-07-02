import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBroadcasts = SlateTool.create(spec, {
  name: 'Manage Broadcasts',
  key: 'manage_broadcasts',
  description: `Create, update, get, list, or delete email broadcasts. Broadcasts are one-time email sends to your subscribers. Set a \`sendAt\` time to schedule sending.`,
  instructions: [
    'Use action "list" to see all broadcasts.',
    'Use action "get" to fetch a specific broadcast by ID.',
    'Use action "create" to draft a new broadcast. Provide at least subject and content.',
    'Use action "update" to modify a draft broadcast.',
    'Use action "delete" to remove a draft broadcast. Broadcasts already sending cannot be deleted.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      broadcastId: z
        .number()
        .optional()
        .describe('Broadcast ID (required for get, update, delete)'),
      subject: z.string().optional().describe('Email subject line'),
      content: z.string().optional().describe('HTML email content'),
      previewText: z.string().optional().describe('Preview text shown in email clients'),
      description: z.string().optional().describe('Internal description of the broadcast'),
      isPublic: z.boolean().optional().describe('Whether the broadcast is publicly viewable'),
      publishedAt: z.string().optional().describe('ISO 8601 publish date'),
      sendAt: z.string().optional().describe('ISO 8601 scheduled send time'),
      emailTemplateId: z.number().optional().describe('Email template ID to use'),
      emailAddress: z.string().optional().describe('Sender email address override'),
      thumbnailUrl: z.string().optional().describe('Thumbnail image URL'),
      thumbnailAlt: z.string().optional().describe('Thumbnail alt text'),
      perPage: z.number().optional().describe('Results per page (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      broadcasts: z
        .array(
          z.object({
            broadcastId: z.number(),
            subject: z.string().nullable(),
            description: z.string().nullable(),
            createdAt: z.string(),
            sendAt: z.string().nullable(),
            publishedAt: z.string().nullable(),
            isPublic: z.boolean()
          })
        )
        .optional()
        .describe('List of broadcasts (for list action)'),
      broadcast: z
        .object({
          broadcastId: z.number(),
          subject: z.string().nullable(),
          content: z.string().nullable(),
          previewText: z.string().nullable(),
          description: z.string().nullable(),
          createdAt: z.string(),
          sendAt: z.string().nullable(),
          publishedAt: z.string().nullable(),
          isPublic: z.boolean(),
          publicUrl: z.string().nullable(),
          emailAddress: z.string().nullable()
        })
        .optional()
        .describe('Single broadcast (for get, create, update)'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listBroadcasts({
        perPage: input.perPage,
        after: input.cursor
      });
      let broadcasts = result.broadcasts.map(b => ({
        broadcastId: b.id,
        subject: b.subject,
        description: b.description,
        createdAt: b.created_at,
        sendAt: b.send_at,
        publishedAt: b.published_at,
        isPublic: b.public
      }));
      return {
        output: {
          broadcasts,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${broadcasts.length}** broadcast(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'get') {
      if (!input.broadcastId) throw new Error('broadcastId is required for get');
      let b = await client.getBroadcast(input.broadcastId);
      return {
        output: {
          broadcast: {
            broadcastId: b.id,
            subject: b.subject,
            content: b.content,
            previewText: b.preview_text,
            description: b.description,
            createdAt: b.created_at,
            sendAt: b.send_at,
            publishedAt: b.published_at,
            isPublic: b.public,
            publicUrl: b.public_url,
            emailAddress: b.email_address
          }
        },
        message: `Broadcast **${b.subject || '(no subject)'}** (#${b.id})`
      };
    }

    if (input.action === 'create') {
      let b = await client.createBroadcast({
        subject: input.subject,
        content: input.content,
        previewText: input.previewText,
        description: input.description,
        isPublic: input.isPublic,
        publishedAt: input.publishedAt,
        sendAt: input.sendAt,
        emailTemplateId: input.emailTemplateId,
        emailAddress: input.emailAddress,
        thumbnailUrl: input.thumbnailUrl,
        thumbnailAlt: input.thumbnailAlt
      });
      return {
        output: {
          broadcast: {
            broadcastId: b.id,
            subject: b.subject,
            content: b.content,
            previewText: b.preview_text,
            description: b.description,
            createdAt: b.created_at,
            sendAt: b.send_at,
            publishedAt: b.published_at,
            isPublic: b.public,
            publicUrl: b.public_url,
            emailAddress: b.email_address
          }
        },
        message: `Created broadcast **${b.subject || '(no subject)'}** (#${b.id})`
      };
    }

    if (input.action === 'update') {
      if (!input.broadcastId) throw new Error('broadcastId is required for update');
      let b = await client.updateBroadcast(input.broadcastId, {
        subject: input.subject,
        content: input.content,
        previewText: input.previewText,
        description: input.description,
        isPublic: input.isPublic,
        publishedAt: input.publishedAt,
        sendAt: input.sendAt,
        emailTemplateId: input.emailTemplateId,
        emailAddress: input.emailAddress,
        thumbnailUrl: input.thumbnailUrl,
        thumbnailAlt: input.thumbnailAlt
      });
      return {
        output: {
          broadcast: {
            broadcastId: b.id,
            subject: b.subject,
            content: b.content,
            previewText: b.preview_text,
            description: b.description,
            createdAt: b.created_at,
            sendAt: b.send_at,
            publishedAt: b.published_at,
            isPublic: b.public,
            publicUrl: b.public_url,
            emailAddress: b.email_address
          }
        },
        message: `Updated broadcast **${b.subject || '(no subject)'}** (#${b.id})`
      };
    }

    if (input.action === 'delete') {
      if (!input.broadcastId) throw new Error('broadcastId is required for delete');
      await client.deleteBroadcast(input.broadcastId);
      return {
        output: {},
        message: `Deleted broadcast #${input.broadcastId}`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  });
