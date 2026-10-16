import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requiredText, responseList, validatePagination } from '../lib/response';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, delete, or list tags. Also apply or remove tags from contacts in bulk. Tag names are case-insensitive and automatically de-duplicated.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete', 'tag_contacts', 'untag_contacts'])
        .describe('Action to perform'),
      page: z.number().optional(),
      perPage: z.number().optional().describe('Results per page, at most 60'),
      tagName: z
        .string()
        .optional()
        .describe('Tag name (for create, tag_contacts, untag_contacts)'),
      tagId: z.string().optional().describe('Tag ID (for delete)'),
      contactIds: z.array(z.string()).optional().describe('Contact IDs to tag/untag')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      pages: z.any().optional(),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            tagName: z.string()
          })
        )
        .optional()
        .describe('List of tags (for list action)'),
      tag: z
        .object({
          tagId: z.string(),
          tagName: z.string()
        })
        .optional()
        .describe('Created or modified tag'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listTags({
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        let tags = responseList(data.tags).map((t: any) => ({
          tagId: requiredId(t.id),
          tagName: requiredText(t.name)
        }));
        return {
          output: { rawResponse: client.responses, tags, pages: data.pages },
          message: `Found **${tags.length}** tags.`
        };
      }

      case 'create': {
        if (!ctx.input.tagName)
          throw createApiServiceError('tagName is required for create action');
        let data = await client.createTag(ctx.input.tagName);
        let tag = data.tag || data;
        return {
          output: {
            rawResponse: client.responses,
            tag: { tagId: requiredId(tag.id), tagName: requiredText(tag.name) }
          },
          message: `Created tag **${tag.name}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.tagId)
          throw createApiServiceError('tagId is required for delete action');
        await client.deleteTag(ctx.input.tagId);
        return {
          output: { rawResponse: client.responses, deleted: true },
          message: `Deleted tag **${ctx.input.tagId}**.`
        };
      }

      case 'tag_contacts': {
        if (!ctx.input.tagName) throw createApiServiceError('tagName is required');
        if (!ctx.input.contactIds?.length)
          throw createApiServiceError('contactIds is required');
        let data = await client.tagContacts(ctx.input.tagName, ctx.input.contactIds);
        let tag = data.tag || data;
        return {
          output: {
            rawResponse: client.responses,
            tag: { tagId: requiredId(tag.id), tagName: requiredText(tag.name) }
          },
          message: `Applied tag **${ctx.input.tagName}** to ${ctx.input.contactIds.length} contact(s).`
        };
      }

      case 'untag_contacts': {
        if (!ctx.input.tagName) throw createApiServiceError('tagName is required');
        if (!ctx.input.contactIds?.length)
          throw createApiServiceError('contactIds is required');
        let data = await client.untagContacts(ctx.input.tagName, ctx.input.contactIds);
        let tag = data.tag || data;
        return {
          output: {
            rawResponse: client.responses,
            tag: { tagId: requiredId(tag.id), tagName: requiredText(tag.name) }
          },
          message: `Removed tag **${ctx.input.tagName}** from ${ctx.input.contactIds.length} contact(s).`
        };
      }
    }
  })
  .build();
