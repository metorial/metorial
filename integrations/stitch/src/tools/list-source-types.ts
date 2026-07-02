import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let listSourceTypes = SlateTool.create(spec, {
  name: 'List Source Types',
  key: 'list_source_types',
  description: `Lists all available data source types that can be configured in Stitch, or retrieves the configuration details for a specific source type. Use this to discover available integrations and understand what properties are required to create a source.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceType: z
        .string()
        .optional()
        .describe(
          'Specific source type to get details for (e.g., "platform.hubspot"). If omitted, lists all available types.'
        )
    })
  )
  .output(
    z.object({
      sourceTypes: z
        .array(z.any())
        .optional()
        .describe('List of all available source types (when no specific type requested)'),
      sourceTypeDetails: z
        .any()
        .optional()
        .describe(
          'Detailed configuration for a specific source type (when sourceType is provided)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    if (ctx.input.sourceType) {
      let details = await client.getSourceType(ctx.input.sourceType);
      return {
        output: { sourceTypeDetails: details },
        message: `Retrieved configuration details for source type **${ctx.input.sourceType}**.`
      };
    }

    let types = await client.listSourceTypes();
    let typeList = Array.isArray(types) ? types : Object.values(types);
    return {
      output: { sourceTypes: typeList },
      message: `Found **${typeList.length}** available source type(s).`
    };
  })
  .build();
