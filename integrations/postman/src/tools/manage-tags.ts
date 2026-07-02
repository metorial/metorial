import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTagsTool = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Get or update tags on Postman collections, workspaces, and APIs. Also supports searching for all entities that have a specific tag. Tags help organize and categorize your Postman resources.`,
  instructions: [
    'When updating tags, provide the complete list of tags — this replaces all existing tags on the entity.',
    'For searching by tag, use action "search" with a tagSlug.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'search']).describe('Operation to perform'),
      entityType: z
        .enum(['collection', 'workspace', 'api'])
        .optional()
        .describe('Entity type (required for get and update)'),
      entityId: z.string().optional().describe('Entity ID (required for get and update)'),
      tagSlugs: z
        .array(z.string())
        .optional()
        .describe('Tag slugs to set (required for update)'),
      tagSlug: z.string().optional().describe('Tag slug to search for (required for search)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            slug: z.string()
          })
        )
        .optional(),
      entities: z
        .array(
          z.object({
            entityId: z.string().optional(),
            entityType: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, entityType, entityId, tagSlugs, tagSlug } = ctx.input;

    if (action === 'get') {
      if (!entityType || !entityId)
        throw new Error('entityType and entityId are required for get.');
      let tags = await client.getTags(entityType, entityId);
      return {
        output: { tags },
        message: `Found **${tags.length}** tag(s) on ${entityType} **${entityId}**.`
      };
    }

    if (action === 'update') {
      if (!entityType || !entityId)
        throw new Error('entityType and entityId are required for update.');
      if (!tagSlugs) throw new Error('tagSlugs is required for update.');
      let formattedTags = tagSlugs.map(slug => ({ slug }));
      await client.updateTags(entityType, entityId, formattedTags);
      return {
        output: { tags: formattedTags },
        message: `Updated tags on ${entityType} **${entityId}** to: ${tagSlugs.join(', ')}.`
      };
    }

    if (!tagSlug) throw new Error('tagSlug is required for search.');
    let result = await client.getEntitiesByTag(
      tagSlug,
      entityType ? { entityType } : undefined
    );
    let entities = (result.entities ?? []).map((e: any) => ({
      entityId: e.entityId,
      entityType: e.entityType,
      name: e.name
    }));
    return {
      output: { entities },
      message: `Found **${entities.length}** entity/entities with tag **"${tagSlug}"**.`
    };
  })
  .build();
