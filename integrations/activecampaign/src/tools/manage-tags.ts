import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { activeCampaignServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Creates, updates, deletes, or lists tags. Tags can be of type "contact" or "template". Use this to manage tag definitions — to add/remove tags from contacts, use the Manage Contact Tags tool instead.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'list']).describe('Action to perform'),
      tagId: z.string().optional().describe('ID of the tag (required for update and delete)'),
      tagName: z
        .string()
        .optional()
        .describe('Name of the tag (required for create and update)'),
      tagType: z
        .string()
        .optional()
        .describe('Type of the tag: "contact" or "template" (required for create)'),
      description: z.string().optional().describe('Description of the tag'),
      search: z.string().optional().describe('Search term to filter tags (for list action)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of tags to return (for list action)'),
      offset: z.number().optional().describe('Pagination offset (for list action)')
    })
  )
  .output(
    z.object({
      tag: z
        .object({
          tagId: z.string(),
          tagName: z.string(),
          tagType: z.string().optional(),
          description: z.string().optional()
        })
        .optional(),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            tagName: z.string(),
            tagType: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.tagName || !ctx.input.tagType) {
          throw activeCampaignServiceError(
            'tagName and tagType are required for creating a tag'
          );
        }
        let result = await client.createTag({
          tag: ctx.input.tagName,
          tagType: ctx.input.tagType,
          description: ctx.input.description
        });
        let tag = result.tag;
        return {
          output: {
            tag: {
              tagId: tag.id,
              tagName: tag.tag,
              tagType: tag.tagType || undefined,
              description: tag.description || undefined
            }
          },
          message: `Tag **${tag.tag}** (ID: ${tag.id}) created.`
        };
      }
      case 'update': {
        if (!ctx.input.tagId) {
          throw activeCampaignServiceError('tagId is required for updating a tag');
        }
        let updatePayload: Record<string, any> = {};
        if (ctx.input.tagName) updatePayload.tag = ctx.input.tagName;
        if (ctx.input.tagType) updatePayload.tagType = ctx.input.tagType;
        if (ctx.input.description !== undefined)
          updatePayload.description = ctx.input.description;

        let result = await client.updateTag(ctx.input.tagId, updatePayload);
        let tag = result.tag;
        return {
          output: {
            tag: {
              tagId: tag.id,
              tagName: tag.tag,
              tagType: tag.tagType || undefined,
              description: tag.description || undefined
            }
          },
          message: `Tag **${tag.tag}** (ID: ${tag.id}) updated.`
        };
      }
      case 'delete': {
        if (!ctx.input.tagId) {
          throw activeCampaignServiceError('tagId is required for deleting a tag');
        }
        await client.deleteTag(ctx.input.tagId);
        return {
          output: { deleted: true },
          message: `Tag (ID: ${ctx.input.tagId}) deleted.`
        };
      }
      case 'list': {
        let params: Record<string, any> = {};
        if (ctx.input.search) params.search = ctx.input.search;
        if (ctx.input.limit) params.limit = ctx.input.limit;
        if (ctx.input.offset) params.offset = ctx.input.offset;

        let result = await client.listTags(params);
        let tags = (result.tags || []).map((t: any) => ({
          tagId: t.id,
          tagName: t.tag,
          tagType: t.tagType || undefined,
          description: t.description || undefined
        }));
        return {
          output: { tags },
          message: `Found **${tags.length}** tags.`
        };
      }
    }
  })
  .build();
