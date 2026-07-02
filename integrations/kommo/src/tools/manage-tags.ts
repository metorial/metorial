import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let tagOutputSchema = z.object({
  tagId: z.number().describe('Tag ID'),
  name: z.string().describe('Tag name'),
  color: z.string().optional().describe('Tag color')
});

export let manageTagsTool = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List existing tags or create new tags for leads, contacts, or companies. Tags are entity-type specific. Use **action** "list" to see all tags, or "create" to add new ones.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z.enum(['list', 'create']).describe('Action to perform'),
      entityType: z
        .enum(['leads', 'contacts', 'companies'])
        .describe('Entity type for the tags'),
      tags: z
        .array(
          z.object({
            name: z.string().describe('Tag name'),
            color: z.string().optional().describe('Tag color (hex)')
          })
        )
        .optional()
        .describe('Tags to create (required when action is "create")'),
      page: z.number().optional().describe('Page number (for listing)'),
      limit: z.number().optional().describe('Results per page (for listing, max 250)')
    })
  )
  .output(
    z.object({
      tags: z.array(tagOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.tags?.length) {
        throw new Error('Tags array is required when action is "create"');
      }
      let created = await client.createTags(ctx.input.entityType, ctx.input.tags);
      let mapped = created.map((t: any) => ({
        tagId: t.id,
        name: t.name,
        color: t.color
      }));
      return {
        output: { tags: mapped },
        message: `Created **${mapped.length}** tag(s) for ${ctx.input.entityType}.`
      };
    }

    let tags = await client.listTags(ctx.input.entityType, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let mapped = tags.map((t: any) => ({
      tagId: t.id,
      name: t.name,
      color: t.color
    }));

    return {
      output: { tags: mapped },
      message: `Found **${mapped.length}** tag(s) for ${ctx.input.entityType}.`
    };
  })
  .build();
