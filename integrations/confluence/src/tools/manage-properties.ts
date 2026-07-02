import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPageProperties = SlateTool.create(spec, {
  name: 'Get Page Properties',
  key: 'get_page_properties',
  description: `Retrieve all content properties (key-value metadata) for a Confluence page.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageId: z.string().describe('The page ID')
    })
  )
  .output(
    z.object({
      properties: z.array(
        z.object({
          propertyId: z.string(),
          key: z.string(),
          value: z.any(),
          versionNumber: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getPageProperties(ctx.input.pageId);

    let properties = response.results.map(p => ({
      propertyId: p.id,
      key: p.key,
      value: p.value,
      versionNumber: p.version?.number
    }));

    return {
      output: { properties },
      message: `Found **${properties.length}** properties on page ${ctx.input.pageId}`
    };
  })
  .build();

export let setPageProperty = SlateTool.create(spec, {
  name: 'Set Page Property',
  key: 'set_page_property',
  description: `Create or update a content property (key-value metadata) on a Confluence page. If updating, provide the property ID and current version number.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      pageId: z.string().describe('The page ID'),
      key: z.string().describe('The property key'),
      value: z.any().describe('The property value (any JSON-serializable data)'),
      propertyId: z.string().optional().describe('The property ID (required for updates)'),
      versionNumber: z
        .number()
        .optional()
        .describe('Current version number (required for updates)')
    })
  )
  .output(
    z.object({
      propertyId: z.string(),
      key: z.string(),
      versionNumber: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result: any;

    if (ctx.input.propertyId && ctx.input.versionNumber !== undefined) {
      result = await client.updatePageProperty(
        ctx.input.pageId,
        ctx.input.propertyId,
        ctx.input.key,
        ctx.input.value,
        ctx.input.versionNumber + 1
      );
    } else {
      result = await client.createPageProperty(
        ctx.input.pageId,
        ctx.input.key,
        ctx.input.value
      );
    }

    return {
      output: {
        propertyId: result.id,
        key: result.key,
        versionNumber: result.version?.number
      },
      message: `${ctx.input.propertyId ? 'Updated' : 'Created'} property **${ctx.input.key}** on page ${ctx.input.pageId}`
    };
  })
  .build();

export let deletePageProperty = SlateTool.create(spec, {
  name: 'Delete Page Property',
  key: 'delete_page_property',
  description: `Delete a content property from a Confluence page.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      pageId: z.string().describe('The page ID'),
      propertyId: z.string().describe('The property ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deletePageProperty(ctx.input.pageId, ctx.input.propertyId);

    return {
      output: { deleted: true },
      message: `Deleted property ${ctx.input.propertyId} from page ${ctx.input.pageId}`
    };
  })
  .build();
