import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, retrieve, update, or delete tags and tag groups in Klaviyo. Tags are used to organize campaigns, flows, lists, and segments for easier filtering and management.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_tags',
          'create_tag',
          'update_tag',
          'delete_tag',
          'list_tag_groups',
          'create_tag_group'
        ])
        .describe('Action to perform'),
      tagId: z.string().optional().describe('Tag ID (for update_tag, delete_tag)'),
      tagGroupId: z.string().optional().describe('Tag group ID (required for create_tag)'),
      name: z.string().optional().describe('Tag or tag group name'),
      exclusive: z
        .boolean()
        .optional()
        .describe(
          'Whether the tag group is exclusive (only one tag per resource, for create_tag_group)'
        ),
      filter: z.string().optional().describe('Filter string for listing'),
      sort: z.string().optional().describe('Sort field'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().optional().describe('Tag name'),
            tagGroupId: z.string().optional().describe('Parent tag group ID')
          })
        )
        .optional()
        .describe('Tag results'),
      tagGroups: z
        .array(
          z.object({
            tagGroupId: z.string().describe('Tag group ID'),
            name: z.string().optional().describe('Tag group name'),
            exclusive: z.boolean().optional().describe('Whether the group is exclusive')
          })
        )
        .optional()
        .describe('Tag group results'),
      tagId: z.string().optional().describe('ID of created/updated tag'),
      tagGroupId: z.string().optional().describe('ID of created tag group'),
      success: z.boolean().describe('Whether the operation succeeded'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
      hasMore: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, tagId, tagGroupId, name, exclusive, filter, sort, pageCursor, pageSize } =
      ctx.input;

    if (action === 'list_tags') {
      let result = await client.getTags({ filter, sort, pageCursor, pageSize });
      let tags = result.data.map(t => ({
        tagId: t.id ?? '',
        name: t.attributes?.name ?? undefined,
        tagGroupId: t.relationships?.['tag-group']?.data?.id ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { tags, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${tags.length}** tags`
      };
    }

    if (action === 'create_tag') {
      if (!name) throw klaviyoServiceError('name is required');
      if (!tagGroupId) throw klaviyoServiceError('tagGroupId is required for creating a tag');
      let result = await client.createTag(name, tagGroupId);
      let t = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { tagId: t?.id, success: true },
        message: `Created tag **${name}** (${t?.id})`
      };
    }

    if (action === 'update_tag') {
      if (!tagId) throw klaviyoServiceError('tagId is required');
      if (!name) throw klaviyoServiceError('name is required');
      let result = await client.updateTag(tagId, name);
      let t = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { tagId: t?.id, success: true },
        message: `Updated tag **${tagId}** to "${name}"`
      };
    }

    if (action === 'delete_tag') {
      if (!tagId) throw klaviyoServiceError('tagId is required');
      await client.deleteTag(tagId);
      return {
        output: { tagId, success: true },
        message: `Deleted tag **${tagId}**`
      };
    }

    if (action === 'list_tag_groups') {
      let result = await client.getTagGroups({ filter, sort, pageCursor, pageSize });
      let tagGroups = result.data.map(g => ({
        tagGroupId: g.id ?? '',
        name: g.attributes?.name ?? undefined,
        exclusive: g.attributes?.exclusive ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { tagGroups, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${tagGroups.length}** tag groups`
      };
    }

    if (action === 'create_tag_group') {
      if (!name) throw klaviyoServiceError('name is required');
      let result = await client.createTagGroup(name, exclusive);
      let g = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { tagGroupId: g?.id, success: true },
        message: `Created tag group **${name}** (${g?.id})`
      };
    }

    throw klaviyoServiceError(`Unknown action: ${action}`);
  })
  .build();
