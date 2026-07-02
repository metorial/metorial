import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMessageStreams = SlateTool.create(spec, {
  name: 'Manage Message Streams',
  key: 'manage_message_streams',
  description: `List, get, create, update, archive, or unarchive Postmark message streams. Message streams separate your email sending into categories (Transactional, Broadcasts, Inbound) for better organization and deliverability.`,
  instructions: [
    'Set **action** to "list", "get", "create", "update", "archive", or "unarchive".',
    'Stream types are "Transactional", "Broadcasts", or "Inbound".'
  ],
  constraints: [
    'Maximum 10 streams per server.',
    'Only one Inbound stream per server.',
    'Default streams cannot be archived.',
    'Archived streams are purged after 45 days.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'archive', 'unarchive'])
        .describe('Action to perform.'),
      streamId: z
        .string()
        .optional()
        .describe('Message stream ID (for get/update/archive/unarchive).'),
      name: z.string().optional().describe('Stream name (for create/update).'),
      description: z.string().optional().describe('Stream description (for create/update).'),
      messageStreamType: z
        .enum(['Transactional', 'Broadcasts', 'Inbound'])
        .optional()
        .describe('Stream type (for create).'),
      includeArchived: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include archived streams in list results.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total message streams.'),
      streams: z
        .array(
          z.object({
            streamId: z.string().describe('Stream ID.'),
            name: z.string().describe('Stream name.'),
            description: z.string().describe('Stream description.'),
            messageStreamType: z.string().describe('Stream type.'),
            createdAt: z.string().describe('Creation timestamp.'),
            archivedAt: z.string().nullable().describe('Archive timestamp, if archived.')
          })
        )
        .optional()
        .describe('List of message streams.'),
      stream: z
        .object({
          streamId: z.string().describe('Stream ID.'),
          name: z.string().describe('Stream name.'),
          description: z.string().describe('Stream description.'),
          messageStreamType: z.string().describe('Stream type.'),
          createdAt: z.string().describe('Creation timestamp.'),
          updatedAt: z.string().describe('Last update timestamp.'),
          archivedAt: z.string().nullable().describe('Archive timestamp.')
        })
        .optional()
        .describe('Stream details.'),
      archived: z.boolean().optional().describe('Whether the stream was archived.'),
      unarchived: z.boolean().optional().describe('Whether the stream was unarchived.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.action === 'list') {
      let result = await client.listMessageStreams({
        includeArchivedStreams: ctx.input.includeArchived
      });

      return {
        output: {
          totalCount: result.TotalCount,
          streams: result.MessageStreams.map(s => ({
            streamId: s.ID,
            name: s.Name,
            description: s.Description,
            messageStreamType: s.MessageStreamType,
            createdAt: s.CreatedAt,
            archivedAt: s.ArchivedAt
          }))
        },
        message: `Found **${result.TotalCount}** message streams.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.streamId) throw new Error('streamId is required');

      let s = await client.getMessageStream(ctx.input.streamId);

      return {
        output: {
          stream: {
            streamId: s.ID,
            name: s.Name,
            description: s.Description,
            messageStreamType: s.MessageStreamType,
            createdAt: s.CreatedAt,
            updatedAt: s.UpdatedAt,
            archivedAt: s.ArchivedAt
          }
        },
        message: `Retrieved stream **${s.Name}** (${s.MessageStreamType}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.streamId || !ctx.input.name || !ctx.input.messageStreamType) {
        throw new Error('streamId, name, and messageStreamType are required for creation');
      }

      let s = await client.createMessageStream({
        id: ctx.input.streamId,
        name: ctx.input.name,
        messageStreamType: ctx.input.messageStreamType,
        description: ctx.input.description
      });

      return {
        output: {
          stream: {
            streamId: s.ID,
            name: s.Name,
            description: s.Description,
            messageStreamType: s.MessageStreamType,
            createdAt: s.CreatedAt,
            updatedAt: s.UpdatedAt,
            archivedAt: s.ArchivedAt
          }
        },
        message: `Created stream **${s.Name}** (ID: ${s.ID}, Type: ${s.MessageStreamType}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.streamId) throw new Error('streamId is required');

      let s = await client.updateMessageStream(ctx.input.streamId, {
        name: ctx.input.name,
        description: ctx.input.description
      });

      return {
        output: {
          stream: {
            streamId: s.ID,
            name: s.Name,
            description: s.Description,
            messageStreamType: s.MessageStreamType,
            createdAt: s.CreatedAt,
            updatedAt: s.UpdatedAt,
            archivedAt: s.ArchivedAt
          }
        },
        message: `Updated stream **${s.Name}**.`
      };
    }

    if (ctx.input.action === 'archive') {
      if (!ctx.input.streamId) throw new Error('streamId is required');

      await client.archiveMessageStream(ctx.input.streamId);

      return {
        output: {
          archived: true
        },
        message: `Archived stream **${ctx.input.streamId}**.`
      };
    }

    // unarchive
    if (!ctx.input.streamId) throw new Error('streamId is required');

    let s = await client.unarchiveMessageStream(ctx.input.streamId);

    return {
      output: {
        unarchived: true,
        stream: {
          streamId: s.ID,
          name: s.Name,
          description: s.Description,
          messageStreamType: s.MessageStreamType,
          createdAt: s.CreatedAt,
          updatedAt: s.UpdatedAt,
          archivedAt: s.ArchivedAt
        }
      },
      message: `Unarchived stream **${s.ID}**.`
    };
  });
