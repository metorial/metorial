import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

let collectionSchema = z.object({
  collectionId: z.string().optional().describe('Collection ID'),
  title: z.string().optional().describe('Collection title'),
  description: z.string().optional().describe('Collection description'),
  created: z.string().optional().describe('Creation date'),
  owner: z
    .object({
      userId: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Collection owner'),
  tlp: z.string().optional().describe('TLP (Traffic Light Protocol) color marking'),
  tags: z.array(z.string()).optional().describe('Tags associated with the collection'),
  contentCount: z.number().optional().describe('Number of items in the collection')
});

export let manageCollections = SlateTool.create(spec, {
  name: 'Manage Collections',
  key: 'manage_collections',
  description: `List, search, retrieve, or create threat intelligence collections (case files). Collections are collaborative workspaces for aggregating indicators of compromise (IPs, URLs, malware hashes, vulnerabilities) and contextual notes.
Use the **action** field to specify the operation: "list" for your own, "listPublic" for public, "search", "get", or "create". Search defaults to private collections you own or can access; set searchScope to public to search public collections.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'listPublic', 'search', 'get', 'create'])
        .describe('Operation to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID (required for "get" action)'),
      searchQuery: z
        .string()
        .optional()
        .describe('Search query (required for "search" action)'),
      searchScope: z
        .enum(['private', 'public'])
        .optional()
        .describe('Collections to search (default: private, including shared collections)'),
      title: z.string().optional().describe('Collection title (required for "create" action)'),
      description: z
        .string()
        .optional()
        .describe('Collection description (for "create" action)'),
      tlp: z
        .enum(['WHITE', 'GREEN', 'AMBER', 'RED'])
        .optional()
        .describe('TLP color marking (for "create" action)'),
      tags: z.array(z.string()).optional().describe('Tags (for "create" action)')
    })
  )
  .output(
    z.object({
      collections: z
        .array(collectionSchema)
        .optional()
        .describe('List of collections (for list/search actions)'),
      collection: collectionSchema
        .optional()
        .describe('Single collection (for get/create actions)'),
      totalCount: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient({
      token: ctx.auth.token,
      password: ctx.auth.password
    });

    let mapCollection = (c: any) => ({
      collectionId: c.caseFileID || c.id,
      title: c.title,
      description: c.description,
      created: c.created,
      owner: c.owner
        ? { userId: c.owner.userid ?? c.owner.uuid, name: c.owner.name }
        : undefined,
      tlp: c.tlp ?? c.tlpColor?.tlpColorName,
      tags: c.tags,
      contentCount: Array.isArray(c.contents) ? c.contents.length : c.contents?.reports?.length
    });

    switch (ctx.input.action) {
      case 'list': {
        ctx.progress('Listing your collections...');
        let data = await client.getMyCollections();
        let casefiles = data.casefiles || data || [];
        let mapped = casefiles.map(mapCollection);
        return {
          output: { collections: mapped, totalCount: mapped.length },
          message: `Found **${mapped.length}** collection(s) in your account`
        };
      }

      case 'listPublic': {
        ctx.progress('Listing public collections...');
        let data = await client.getPublicCollections();
        let casefiles = data.casefiles || data || [];
        let mapped = casefiles.map(mapCollection);
        return {
          output: { collections: mapped, totalCount: mapped.length },
          message: `Found **${mapped.length}** public collection(s)`
        };
      }

      case 'search': {
        if (!ctx.input.searchQuery)
          throw createApiServiceError('searchQuery is required for "search" action.');
        ctx.progress('Searching collections...');
        let data = await client.searchCollections(
          ctx.input.searchQuery,
          ctx.input.searchScope
        );
        let casefiles = data.casefiles || data || [];
        let mapped = casefiles.map(mapCollection);
        return {
          output: { collections: mapped, totalCount: data.totalRows ?? mapped.length },
          message: `Found **${mapped.length}** collection(s) matching "${ctx.input.searchQuery}"`
        };
      }

      case 'get': {
        if (!ctx.input.collectionId)
          throw createApiServiceError('collectionId is required for "get" action.');
        ctx.progress('Fetching collection...');
        let data = await client.getCollection(ctx.input.collectionId);
        return {
          output: { collection: mapCollection(data) },
          message: `Retrieved collection **${data.title || ctx.input.collectionId}**`
        };
      }

      case 'create': {
        if (!ctx.input.title)
          throw createApiServiceError('title is required for "create" action.');
        ctx.progress('Creating collection...');
        let data = await client.createCollection({
          title: ctx.input.title,
          description: ctx.input.description,
          tlp: ctx.input.tlp,
          tags: ctx.input.tags
        });
        return {
          output: { collection: mapCollection(data) },
          message: `Created collection **${ctx.input.title}**`
        };
      }
    }
  })
  .build();
