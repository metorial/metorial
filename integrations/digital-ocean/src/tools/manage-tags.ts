import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, create, delete tags, or tag/untag resources. Tags are labels you can apply to DigitalOcean resources for organization and bulk operations.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete', 'tag_resources', 'untag_resources'])
        .describe('Action to perform'),
      tagName: z
        .string()
        .optional()
        .describe('Tag name (required for create, delete, tag/untag resources)'),
      resources: z
        .array(
          z.object({
            resourceId: z.string().describe('Resource ID'),
            resourceType: z
              .string()
              .describe('Resource type (e.g., "droplet", "volume", "database")')
          })
        )
        .optional()
        .describe('Resources to tag/untag')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            name: z.string().describe('Tag name'),
            resourceCount: z.number().optional().describe('Number of tagged resources')
          })
        )
        .optional()
        .describe('List of tags'),
      tag: z
        .object({
          name: z.string().describe('Tag name')
        })
        .optional()
        .describe('Created tag'),
      deleted: z.boolean().optional().describe('Whether the tag was deleted'),
      tagged: z.boolean().optional().describe('Whether resources were tagged/untagged')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let tags = await client.listTags();
      return {
        output: {
          tags: tags.map((t: any) => ({
            name: t.name,
            resourceCount: t.resources?.count
          }))
        },
        message: `Found **${tags.length}** tag(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.tagName) {
        throw digitalOceanValidationError('tagName is required');
      }
      let tag = await client.createTag(ctx.input.tagName);
      return {
        output: { tag: { name: tag.name } },
        message: `Created tag **${tag.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tagName) {
        throw digitalOceanValidationError('tagName is required');
      }
      await client.deleteTag(ctx.input.tagName);
      return {
        output: { deleted: true },
        message: `Deleted tag **${ctx.input.tagName}**.`
      };
    }

    if (ctx.input.action === 'tag_resources') {
      if (!ctx.input.tagName || !ctx.input.resources) {
        throw digitalOceanValidationError('tagName and resources are required');
      }
      await client.tagResources(ctx.input.tagName, ctx.input.resources);
      return {
        output: { tagged: true },
        message: `Tagged **${ctx.input.resources.length}** resource(s) with **${ctx.input.tagName}**.`
      };
    }

    // untag_resources
    if (!ctx.input.tagName || !ctx.input.resources) {
      throw digitalOceanValidationError('tagName and resources are required');
    }
    await client.untagResources(ctx.input.tagName, ctx.input.resources);

    return {
      output: { tagged: false },
      message: `Untagged **${ctx.input.resources.length}** resource(s) from **${ctx.input.tagName}**.`
    };
  })
  .build();
