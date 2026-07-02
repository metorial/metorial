import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let linkOutputSchema = z.object({
  toEntityId: z.number().describe('Linked entity ID'),
  toEntityType: z.string().describe('Linked entity type'),
  metadata: z.any().optional().describe('Link metadata')
});

export let manageEntityLinksTool = SlateTool.create(spec, {
  name: 'Manage Entity Links',
  key: 'manage_entity_links',
  description: `List, create, or remove links between entities. Link leads to contacts, contacts to companies, leads to catalog items, etc. Use **action** "list" to see existing links, "link" to create new links, or "unlink" to remove them.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z.enum(['list', 'link', 'unlink']).describe('Action to perform'),
      entityType: z.enum(['leads', 'contacts', 'companies']).describe('Source entity type'),
      entityId: z.number().describe('Source entity ID'),
      links: z
        .array(
          z.object({
            toEntityId: z.number().describe('Target entity ID'),
            toEntityType: z
              .enum(['leads', 'contacts', 'companies', 'catalog_elements'])
              .describe('Target entity type')
          })
        )
        .optional()
        .describe('Links to create or remove (required for "link" and "unlink" actions)'),
      page: z.number().optional().describe('Page number (for listing)'),
      limit: z.number().optional().describe('Results per page (for listing, max 250)')
    })
  )
  .output(
    z.object({
      links: z.array(linkOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.action === 'link') {
      if (!ctx.input.links?.length) {
        throw new Error('Links array is required when action is "link"');
      }
      let apiLinks = ctx.input.links.map(l => ({
        to_entity_id: l.toEntityId,
        to_entity_type: l.toEntityType
      }));
      let result = await client.linkEntities(
        ctx.input.entityType,
        ctx.input.entityId,
        apiLinks
      );
      return {
        output: {
          links: (result || []).map((l: any) => ({
            toEntityId: l.to_entity_id,
            toEntityType: l.to_entity_type,
            metadata: l.metadata
          }))
        },
        message: `Linked **${ctx.input.links.length}** entity(ies) to ${ctx.input.entityType} **${ctx.input.entityId}**.`
      };
    }

    if (ctx.input.action === 'unlink') {
      if (!ctx.input.links?.length) {
        throw new Error('Links array is required when action is "unlink"');
      }
      let apiLinks = ctx.input.links.map(l => ({
        to_entity_id: l.toEntityId,
        to_entity_type: l.toEntityType
      }));
      await client.unlinkEntities(ctx.input.entityType, ctx.input.entityId, apiLinks);
      return {
        output: { links: [] },
        message: `Unlinked **${ctx.input.links.length}** entity(ies) from ${ctx.input.entityType} **${ctx.input.entityId}**.`
      };
    }

    let links = await client.listLinks(ctx.input.entityType, ctx.input.entityId, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let mapped = links.map((l: any) => ({
      toEntityId: l.to_entity_id,
      toEntityType: l.to_entity_type,
      metadata: l.metadata
    }));

    return {
      output: { links: mapped },
      message: `Found **${mapped.length}** link(s) for ${ctx.input.entityType} **${ctx.input.entityId}**.`
    };
  })
  .build();
