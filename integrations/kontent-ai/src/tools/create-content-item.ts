import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let createContentItem = SlateTool.create(spec, {
  name: 'Create Content Item',
  key: 'create_content_item',
  description: `Creates a new content item in Kontent.ai. Content items are wrappers for language variants - after creation, upsert a language variant to add actual content. You can optionally set an initial language variant with element values during creation.`,
  instructions: [
    'The content type codename must reference an existing content type in the environment.',
    'After creating an item, use the "Upsert Language Variant" tool to add content in specific languages.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name of the content item'),
      contentTypeCodename: z
        .string()
        .describe('Codename of the content type to use as a template'),
      codename: z
        .string()
        .optional()
        .describe('Custom codename for the item. Auto-generated from name if omitted.'),
      externalId: z
        .string()
        .optional()
        .describe('External ID for integration with external systems'),
      collectionCodename: z
        .string()
        .optional()
        .describe('Codename of the collection to place the item in')
    })
  )
  .output(
    z.object({
      contentItemId: z.string().describe('Internal ID of the created content item'),
      name: z.string().describe('Name of the content item'),
      codename: z.string().describe('Codename of the content item'),
      typeId: z.string().optional().describe('ID of the content type'),
      lastModified: z.string().describe('ISO 8601 timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let item = await client.createContentItem({
      name: ctx.input.name,
      codename: ctx.input.codename,
      type: { codename: ctx.input.contentTypeCodename },
      externalId: ctx.input.externalId,
      collection: ctx.input.collectionCodename
        ? { codename: ctx.input.collectionCodename }
        : undefined
    });

    return {
      output: {
        contentItemId: item.id,
        name: item.name,
        codename: item.codename,
        typeId: item.type?.id,
        lastModified: item.last_modified
      },
      message: `Created content item **"${item.name}"** (codename: \`${item.codename}\`, ID: \`${item.id}\`).`
    };
  })
  .build();
