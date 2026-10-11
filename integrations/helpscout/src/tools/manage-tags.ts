import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { halPageInfo } from '../lib/pagination';
import { spec } from '../spec';

let tagSchema = z.object({
  tagId: z.number().describe('Tag ID'),
  name: z.string().describe('Tag name'),
  slug: z.string().optional().describe('Slugified tag name'),
  color: z.string().nullable().optional().describe('Tag color'),
  ticketCount: z.number().optional().describe('Number of conversations with this tag'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modified timestamp')
});

let mapTag = (t: any) => ({
  tagId: t.id,
  name: t.name ?? t.tag,
  slug: t.slug ?? undefined,
  color: t.color ?? null,
  ticketCount: t.ticketCount,
  createdAt: t.createdAt,
  modifiedAt: t.updatedAt ?? undefined
});

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List or get the tags used to categorize conversations across all mailboxes. To create or apply a tag, set it on a conversation with update_conversation; Help Scout creates missing tags automatically. Help Scout does not support renaming or deleting tags through its API.`,
  instructions: [
    'Use action "list" to page through tags (50 per page, alphabetical) and "get" to read one tag by ID.',
    'The create, update, and delete actions are not supported by the Help Scout API and return an error explaining the alternative.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe(
          'Action to perform. Only list and get are supported by Help Scout; apply new tags with update_conversation.'
        ),
      tagId: z.number().optional().describe('Tag ID (required for get)'),
      name: z.string().optional().describe('Tag name (not used by list or get)'),
      page: z.number().optional().describe('Page number for list action')
    })
  )
  .output(
    z.object({
      tags: z.array(tagSchema).optional().describe('List of tags (for list action)'),
      tag: tagSchema.optional().describe('Single tag (for get action)'),
      totalCount: z.number().optional().describe('Total tags (list)'),
      currentPage: z.number().optional().describe('Current page (list)'),
      totalPages: z.number().optional().describe('Total pages (list)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let data = await client.listTags({ page: ctx.input.page });
      let tags = (data?._embedded?.tags ?? []).map(mapTag);
      let page = halPageInfo(data, tags.length);

      return {
        output: { tags, ...page, success: true },
        message: `Found **${page.totalCount}** tags (page ${page.currentPage} of ${page.totalPages}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.tagId) throw helpscoutServiceError('Tag ID is required for get action');
      let data = await client.getTag(ctx.input.tagId);
      let tag = mapTag(data);
      return {
        output: { tag, success: true },
        message: `Tag **${tag.name}** (#${tag.tagId}).`
      };
    }

    // Help Scout's Inbox API only exposes List Tags and Get Tag.
    // https://developer.helpscout.com/mailbox-api/endpoints/tags/list/
    if (ctx.input.action === 'create') {
      throw helpscoutServiceError(
        'Help Scout does not support creating standalone tags through its API. Add the tag to a conversation with update_conversation (tags) and Help Scout creates it automatically.'
      );
    }

    throw helpscoutServiceError(
      `Help Scout does not support ${ctx.input.action === 'update' ? 'renaming' : 'deleting'} tags through its API. Manage tags in the Help Scout web app, or change a conversation's tags with update_conversation.`
    );
  })
  .build();
