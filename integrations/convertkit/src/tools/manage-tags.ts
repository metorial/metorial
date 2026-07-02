import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, update, list tags, or manage tag-subscriber associations. Use this to organize subscribers by adding/removing tags, creating new tags, or listing all tags.`,
  instructions: [
    'Use action "list" to retrieve all tags.',
    'Use action "create" to create a new tag with a given name.',
    'Use action "update" to rename an existing tag.',
    'Use action "add_to_subscriber" to tag a subscriber (provide tagId and either subscriberId or subscriberEmail).',
    'Use action "remove_from_subscriber" to untag a subscriber (provide tagId and subscriberId).'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'add_to_subscriber', 'remove_from_subscriber'])
        .describe('Action to perform'),
      tagId: z
        .number()
        .optional()
        .describe('Tag ID (required for update, add_to_subscriber, remove_from_subscriber)'),
      tagName: z.string().optional().describe('Tag name (required for create and update)'),
      subscriberId: z.number().optional().describe('Subscriber ID to tag/untag'),
      subscriberEmail: z
        .string()
        .optional()
        .describe(
          'Subscriber email to tag (alternative to subscriberId for add_to_subscriber)'
        ),
      perPage: z.number().optional().describe('Results per page for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID'),
            tagName: z.string().describe('Tag name'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of tags (for list action)'),
      tag: z
        .object({
          tagId: z.number().describe('Tag ID'),
          tagName: z.string().describe('Tag name'),
          createdAt: z.string().describe('Creation timestamp')
        })
        .optional()
        .describe('Single tag (for create/update)'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listTags({ perPage: input.perPage, after: input.cursor });
      let tags = result.tags.map(t => ({
        tagId: t.id,
        tagName: t.name,
        createdAt: t.created_at
      }));
      return {
        output: {
          tags,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${tags.length}** tag(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'create') {
      if (!input.tagName) throw kitServiceError('tagName is required for create');
      let tag = await client.createTag(input.tagName);
      return {
        output: {
          tag: { tagId: tag.id, tagName: tag.name, createdAt: tag.created_at }
        },
        message: `Created tag **${tag.name}** (#${tag.id})`
      };
    }

    if (input.action === 'update') {
      if (!input.tagId) throw kitServiceError('tagId is required for update');
      if (!input.tagName) throw kitServiceError('tagName is required for update');
      let tag = await client.updateTag(input.tagId, input.tagName);
      return {
        output: {
          tag: { tagId: tag.id, tagName: tag.name, createdAt: tag.created_at }
        },
        message: `Renamed tag to **${tag.name}** (#${tag.id})`
      };
    }

    if (input.action === 'add_to_subscriber') {
      if (!input.tagId) throw kitServiceError('tagId is required for add_to_subscriber');
      if (input.subscriberId) {
        await client.tagSubscriberById(input.tagId, input.subscriberId);
        return {
          output: {},
          message: `Added tag #${input.tagId} to subscriber #${input.subscriberId}`
        };
      } else if (input.subscriberEmail) {
        await client.tagSubscriberByEmail(input.tagId, input.subscriberEmail);
        return {
          output: {},
          message: `Added tag #${input.tagId} to subscriber **${input.subscriberEmail}**`
        };
      }
      throw kitServiceError(
        'subscriberId or subscriberEmail is required for add_to_subscriber'
      );
    }

    if (input.action === 'remove_from_subscriber') {
      if (!input.tagId) throw kitServiceError('tagId is required for remove_from_subscriber');
      if (!input.subscriberId)
        throw kitServiceError('subscriberId is required for remove_from_subscriber');
      await client.untagSubscriberById(input.tagId, input.subscriberId);
      return {
        output: {},
        message: `Removed tag #${input.tagId} from subscriber #${input.subscriberId}`
      };
    }

    throw kitServiceError(`Unknown action: ${input.action}`);
  });
