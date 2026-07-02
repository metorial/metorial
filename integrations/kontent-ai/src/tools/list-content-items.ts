import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let listContentItems = SlateTool.create(spec, {
  name: 'List Content Items',
  key: 'list_content_items',
  description: `Retrieves content items from a Kontent.ai environment. Returns item metadata including name, codename, type, collection, and last modified date. Use the continuation token for paginating through large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      continuationToken: z
        .string()
        .optional()
        .describe(
          'Continuation token for paginating through results. Omit for the first page.'
        )
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          contentItemId: z.string().describe('Internal ID of the content item'),
          name: z.string().describe('Name of the content item'),
          codename: z.string().describe('Codename of the content item'),
          typeId: z.string().optional().describe('ID of the content type'),
          collectionId: z.string().optional().describe('ID of the collection'),
          externalId: z.string().optional().describe('External ID if set'),
          lastModified: z.string().describe('ISO 8601 timestamp of last modification')
        })
      ),
      continuationToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let result = await client.listContentItems(ctx.input.continuationToken);

    let items = result.items.map(item => ({
      contentItemId: item.id,
      name: item.name,
      codename: item.codename,
      typeId: item.type?.id,
      collectionId: item.collection?.id,
      externalId: item.external_id,
      lastModified: item.last_modified
    }));

    return {
      output: {
        items,
        continuationToken: result.continuationToken
      },
      message: `Retrieved **${items.length}** content items.${result.continuationToken ? ' More items available with continuation token.' : ''}`
    };
  })
  .build();
