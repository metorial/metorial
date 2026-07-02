import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createSourceTool = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description: `Create a new data source connector in Airbyte. Requires a name, workspace, source type (e.g. "postgres", "stripe", "hubspot"), and source-specific configuration with credentials and connection settings.`,
  instructions: [
    'The configuration object varies by source type. Check Airbyte documentation for the specific source type configuration schema.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Display name for the source.'),
      workspaceId: z.string().describe('UUID of the workspace to create the source in.'),
      sourceType: z
        .string()
        .describe('The connector type (e.g. "postgres", "mysql", "stripe", "hubspot").'),
      configuration: z
        .record(z.string(), z.any())
        .describe(
          'Source-specific configuration including credentials and connection settings.'
        )
    })
  )
  .output(
    z.object({
      sourceId: z.string(),
      name: z.string(),
      sourceType: z.string(),
      workspaceId: z.string(),
      configuration: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let source = await client.createSource({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      sourceType: ctx.input.sourceType,
      configuration: ctx.input.configuration
    });

    return {
      output: {
        sourceId: source.sourceId,
        name: source.name,
        sourceType: source.sourceType,
        workspaceId: source.workspaceId,
        configuration: source.configuration
      },
      message: `Created source **${source.name}** (ID: ${source.sourceId}, type: ${source.sourceType}).`
    };
  })
  .build();
