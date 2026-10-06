import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createSourceTool = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description: `Create a new data source connector in Airbyte. Requires a name and a workspace discovered with list_workspaces, plus a connector type or custom definition ID (e.g. "postgres", "stripe", "hubspot"), and source-specific configuration with credentials and connection settings.`,
  instructions: [
    'The configuration object varies by source type. Check Airbyte documentation for the specific source type configuration schema.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Display name for the source.'),
      workspaceId: z
        .string()
        .describe('Workspace ID. Call list_workspaces to discover authorized workspaces.'),
      sourceType: z
        .string()
        .optional()
        .describe('The connector type (e.g. "postgres", "mysql", "stripe", "hubspot").'),
      definitionId: z
        .string()
        .optional()
        .describe(
          'Custom connector definition ID from list_source_definitions; omit sourceType when using it.'
        ),
      configuration: z
        .record(z.string(), z.unknown())
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
      configuration: z
        .record(z.string(), z.unknown())
        .describe(
          'Configuration keys with all values redacted. Never reuse these values as connector input.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let source = await client.createSource({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      sourceType: ctx.input.sourceType,
      definitionId: ctx.input.definitionId,
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
