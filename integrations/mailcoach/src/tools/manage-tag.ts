import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagOutputSchema = z.object({
  tagUuid: z.string().describe('Unique identifier of the tag'),
  name: z.string().describe('Tag name'),
  emailListUuid: z.string().describe('UUID of the email list the tag belongs to'),
  visibleInPreferences: z
    .boolean()
    .describe('Whether the tag is visible in subscriber preferences'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `List, create, update, or delete tags on an email list. Tags are used for categorizing subscribers and building segments.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      emailListUuid: z.string().describe('UUID of the email list'),
      tagUuid: z.string().optional().describe('UUID of the tag (required for update, delete)'),
      name: z.string().optional().describe('Tag name (required for create and update)'),
      visibleInPreferences: z
        .boolean()
        .optional()
        .describe('Whether the tag should be visible in subscriber preferences'),
      page: z.number().optional().describe('Page number for pagination (list only)')
    })
  )
  .output(
    z.object({
      tag: tagOutputSchema.nullable().describe('Single tag result (for create, update)'),
      tagList: z.array(tagOutputSchema).nullable().describe('List of tags (for list action)'),
      totalCount: z.number().nullable().describe('Total count of tags (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listTags(ctx.input.emailListUuid, { page: ctx.input.page });
      let tagList = (result.data || []).map(mapTag);
      return {
        output: { tag: null, tagList, totalCount: result.meta?.total ?? tagList.length },
        message: `Found **${tagList.length}** tag(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tagUuid) throw new Error('tagUuid is required for delete');
      await client.deleteTag(ctx.input.emailListUuid, ctx.input.tagUuid);
      return {
        output: { tag: null, tagList: null, totalCount: null },
        message: `Tag **${ctx.input.tagUuid}** has been deleted.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      let result = await client.createTag(ctx.input.emailListUuid, {
        name: ctx.input.name,
        visible_in_preferences: ctx.input.visibleInPreferences
      });
      return {
        output: { tag: mapTag(result), tagList: null, totalCount: null },
        message: `Tag **${result.name}** has been created.`
      };
    }

    // update
    if (!ctx.input.tagUuid) throw new Error('tagUuid is required for update');
    if (!ctx.input.name) throw new Error('name is required for update');

    let result = await client.updateTag(ctx.input.emailListUuid, ctx.input.tagUuid, {
      name: ctx.input.name,
      visible_in_preferences: ctx.input.visibleInPreferences
    });

    return {
      output: { tag: mapTag(result), tagList: null, totalCount: null },
      message: `Tag **${result.name}** has been updated.`
    };
  });

let mapTag = (t: any) => ({
  tagUuid: t.uuid,
  name: t.name,
  emailListUuid: t.email_list_uuid,
  visibleInPreferences: t.visible_in_preferences ?? false,
  createdAt: t.created_at,
  updatedAt: t.updated_at
});
