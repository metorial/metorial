import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
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
    let client = new GistClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listTags();
        let tags = (data.tags || []).map((t: any) => ({
          tagId: String(t.id),
          tagName: t.name
        }));
        return {
          output: { tags },
          message: `Found **${tags.length}** tags.`
        };
      }

      case 'create': {
        if (!ctx.input.tagName) throw new Error('tagName is required for create action');
        let data = await client.createTag(ctx.input.tagName);
        let tag = data.tag || data;
        return {
          output: {
            tag: { tagId: String(tag.id), tagName: tag.name }
          },
          message: `Created tag **${tag.name}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.tagId) throw new Error('tagId is required for delete action');
        await client.deleteTag(ctx.input.tagId);
        return {
          output: { deleted: true },
          message: `Deleted tag **${ctx.input.tagId}**.`
        };
      }

      case 'tag_contacts': {
        if (!ctx.input.tagName) throw new Error('tagName is required');
        if (!ctx.input.contactIds?.length) throw new Error('contactIds is required');
        let data = await client.tagContacts(ctx.input.tagName, ctx.input.contactIds);
        let tag = data.tag || data;
        return {
          output: {
            tag: { tagId: String(tag.id), tagName: tag.name }
          },
          message: `Applied tag **${ctx.input.tagName}** to ${ctx.input.contactIds.length} contact(s).`
        };
      }

      case 'untag_contacts': {
        if (!ctx.input.tagName) throw new Error('tagName is required');
        if (!ctx.input.contactIds?.length) throw new Error('contactIds is required');
        let data = await client.untagContacts(ctx.input.tagName, ctx.input.contactIds);
        let tag = data.tag || data;
        return {
          output: {
            tag: { tagId: String(tag.id), tagName: tag.name }
          },
          message: `Removed tag **${ctx.input.tagName}** from ${ctx.input.contactIds.length} contact(s).`
        };
      }
    }
  })
  .build();
