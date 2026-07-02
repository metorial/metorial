import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createDestinationTool = SlateTool.create(spec, {
  name: 'Create Destination',
  key: 'create_destination',
  description: `Create a new destination connector in Airbyte. Requires a name, workspace, destination type (e.g. "bigquery", "snowflake", "postgres"), and destination-specific configuration with credentials and connection settings.`,
  instructions: [
    'The configuration object varies by destination type. Check Airbyte documentation for the specific destination type configuration schema.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Display name for the destination.'),
      workspaceId: z.string().describe('UUID of the workspace to create the destination in.'),
      destinationType: z
        .string()
        .describe('The connector type (e.g. "bigquery", "snowflake", "postgres", "s3").'),
      configuration: z
        .record(z.string(), z.any())
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
      configuration: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let dest = await client.createDestination({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      destinationType: ctx.input.destinationType,
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
