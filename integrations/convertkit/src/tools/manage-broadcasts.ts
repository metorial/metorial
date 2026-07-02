import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBroadcasts = SlateTool.create(spec, {
  name: 'Manage Broadcasts',
  key: 'manage_broadcasts',
  description: `Create, update, get, list, delete, or inspect analytics for email broadcasts. Broadcasts are one-time email sends to your subscribers. Set a \`sendAt\` time to schedule sending.`,
  instructions: [
    'Use action "list" to see all broadcasts.',
    'Use action "get" to fetch a specific broadcast by ID.',
    'Use action "create" to draft a new broadcast. Provide at least subject and content.',
    'Use action "update" to modify a draft broadcast.',
    'Use action "delete" to remove a draft broadcast. Broadcasts already sending cannot be deleted.',
    'Use action "get_stats" to retrieve delivery and engagement stats for a broadcast.',
    'Use action "list_clicks" to retrieve tracked link click stats for a broadcast.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'get_stats', 'list_clicks'])
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
      perPage: z.number().optional().describe('Results per page (for list or list_clicks)'),
      cursor: z.string().optional().describe('Pagination cursor (for list or list_clicks)')
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
      stats: z
        .object({
          recipients: z.number(),
          openRate: z.number(),
          emailsOpened: z.number(),
          clickRate: z.number(),
          unsubscribeRate: z.number(),
          unsubscribes: z.number(),
          totalClicks: z.number(),
          showTotalClicks: z.boolean(),
          status: z.string(),
          progress: z.number(),
          openTrackingDisabled: z.boolean(),
          clickTrackingDisabled: z.boolean()
        })
        .optional()
        .describe('Broadcast analytics (for get_stats action)'),
      clicks: z
        .array(
          z.object({
            url: z.string(),
            uniqueClicks: z.number(),
            clickToDeliveryRate: z.number(),
            clickToOpenRate: z.number()
          })
        )
        .optional()
        .describe('Tracked link click stats (for list_clicks action)'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
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
      if (!input.broadcastId) throw kitServiceError('broadcastId is required for get');
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
      if (!input.broadcastId) throw kitServiceError('broadcastId is required for update');
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
      if (!input.broadcastId) throw kitServiceError('broadcastId is required for delete');
      await client.deleteBroadcast(input.broadcastId);
      return {
        output: {},
        message: `Deleted broadcast #${input.broadcastId}`
      };
    }

    if (input.action === 'get_stats') {
      if (!input.broadcastId) throw kitServiceError('broadcastId is required for get_stats');
      let stats = await client.getBroadcastStats(input.broadcastId);
      return {
        output: {
          stats: {
            recipients: stats.recipients,
            openRate: stats.open_rate,
            emailsOpened: stats.emails_opened,
            clickRate: stats.click_rate,
            unsubscribeRate: stats.unsubscribe_rate,
            unsubscribes: stats.unsubscribes,
            totalClicks: stats.total_clicks,
            showTotalClicks: stats.show_total_clicks,
            status: stats.status,
            progress: stats.progress,
            openTrackingDisabled: stats.open_tracking_disabled,
            clickTrackingDisabled: stats.click_tracking_disabled
          }
        },
        message: `Retrieved stats for broadcast #${input.broadcastId}.`
      };
    }

    if (input.action === 'list_clicks') {
      if (!input.broadcastId) throw kitServiceError('broadcastId is required for list_clicks');
      let result = await client.getBroadcastClicks(input.broadcastId, {
        perPage: input.perPage,
        after: input.cursor
      });
      let clicks = result.clicks.map(click => ({
        url: click.url,
        uniqueClicks: click.unique_clicks,
        clickToDeliveryRate: click.click_to_delivery_rate,
        clickToOpenRate: click.click_to_open_rate
      }));
      return {
        output: {
          clicks,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${clicks.length}** tracked link(s) for broadcast #${input.broadcastId}.`
      };
    }

    throw kitServiceError(`Unknown action: ${input.action}`);
  });
