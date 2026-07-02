import { SlateTool } from 'slates';
import { z } from 'zod';
import { SitesClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomProperties = SlateTool.create(spec, {
  name: 'List Custom Properties',
  key: 'list_custom_properties',
  description: `List all custom properties configured for a site. Custom properties allow capturing additional metadata with events (e.g., author, category, logged-in status). Requires a Sites API key (Enterprise plan).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site')
    })
  )
  .output(
    z.object({
      customProperties: z
        .array(z.string())
        .describe('List of custom property names configured for the site')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listCustomProperties(ctx.input.siteId);
    let properties = result.custom_properties ?? result ?? [];

    return {
      output: {
        customProperties: properties
      },
      message: `Found **${properties.length}** custom property/properties for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let createCustomProperty = SlateTool.create(spec, {
  name: 'Create Custom Property',
  key: 'create_custom_property',
  description: `Create a custom property for a site. This endpoint is idempotent — creating a property that already exists will not fail. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      propertyName: z.string().describe('Name of the custom property to create')
    })
  )
  .output(
    z.object({
      created: z
        .boolean()
        .describe('Whether the custom property was created or already exists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.createCustomProperty(ctx.input.siteId, ctx.input.propertyName);

    return {
      output: {
        created: true
      },
      message: `Custom property **${ctx.input.propertyName}** created/confirmed for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let deleteCustomProperty = SlateTool.create(spec, {
  name: 'Delete Custom Property',
  key: 'delete_custom_property',
  description: `Delete a custom property from a site. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      propertyName: z.string().describe('Name of the custom property to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the custom property was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteCustomProperty(ctx.input.siteId, ctx.input.propertyName);

    return {
      output: {
        deleted: true
      },
      message: `Custom property **${ctx.input.propertyName}** deleted from site **${ctx.input.siteId}**.`
    };
  })
  .build();
