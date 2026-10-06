import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createDestinationTool = SlateTool.create(spec, {
  name: 'Create Destination',
  key: 'create_destination',
  description: `Create a new destination connector in Airbyte. Requires a name and a workspace discovered with list_workspaces, plus a connector type or custom definition ID (e.g. "bigquery", "snowflake", "postgres"), and destination-specific configuration with credentials and connection settings.`,
  instructions: [
    'The configuration object varies by destination type. Check Airbyte documentation for the specific destination type configuration schema.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Display name for the destination.'),
      workspaceId: z
        .string()
        .describe('Workspace ID. Call list_workspaces to discover authorized workspaces.'),
      destinationType: z
        .string()
        .optional()
        .describe('The connector type (e.g. "bigquery", "snowflake", "postgres", "s3").'),
      definitionId: z
        .string()
        .optional()
        .describe(
          'Custom connector definition ID from list_destination_definitions; omit destinationType when using it.'
        ),
      configuration: z
        .record(z.string(), z.unknown())
        .describe(
          'Destination-specific configuration including credentials and connection settings.'
        )
    })
  )
  .output(
    z.object({
      destinationId: z.string(),
      name: z.string(),
      destinationType: z.string(),
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
    let dest = await client.createDestination({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      destinationType: ctx.input.destinationType,
      definitionId: ctx.input.definitionId,
      configuration: ctx.input.configuration
    });

    return {
      output: {
        destinationId: dest.destinationId,
        name: dest.name,
        destinationType: dest.destinationType,
        workspaceId: dest.workspaceId,
        configuration: dest.configuration
      },
      message: `Created destination **${dest.name}** (ID: ${dest.destinationId}, type: ${dest.destinationType}).`
    };
  })
  .build();
