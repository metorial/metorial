import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

let destinationOutputSchema = z.object({
  destinationId: z.number().describe('Unique identifier for the destination'),
  type: z
    .string()
    .describe('Destination type (e.g., redshift, bigquery, snowflake, postgres)'),
  name: z.string().nullable().describe('Display name'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Connection properties (excludes sensitive credentials)'),
  createdAt: z.string().nullable().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().nullable().describe('ISO 8601 last updated timestamp'),
  reportCard: z.any().optional().describe('Configuration status report card')
});

export let getDestination = SlateTool.create(spec, {
  name: 'Get Destination',
  key: 'get_destination',
  description: `Retrieves the current destination (data warehouse) configuration. Stitch supports only a single destination per account. Also supports listing available destination types for discovery.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listTypes: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, returns available destination types instead of the current destination'
        ),
      destinationType: z
        .string()
        .optional()
        .describe('Get configuration schema for a specific destination type')
    })
  )
  .output(
    z.object({
      destinations: z
        .array(destinationOutputSchema)
        .optional()
        .describe('Current destination(s) configured for the account'),
      destinationTypes: z
        .array(z.any())
        .optional()
        .describe('Available destination types (when listTypes is true)'),
      destinationTypeDetails: z
        .any()
        .optional()
        .describe('Configuration details for a specific destination type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    if (ctx.input.destinationType) {
      let details = await client.getDestinationType(ctx.input.destinationType);
      return {
        output: { destinationTypeDetails: details },
        message: `Retrieved configuration details for destination type **${ctx.input.destinationType}**.`
      };
    }

    if (ctx.input.listTypes) {
      let types = await client.listDestinationTypes();
      let typeList = Array.isArray(types) ? types : Object.values(types);
      return {
        output: { destinationTypes: typeList },
        message: `Found **${typeList.length}** available destination type(s).`
      };
    }

    let rawDestinations = await client.listDestinations();
    let destinations = rawDestinations.map((d: any) => ({
      destinationId: d.id,
      type: d.type,
      name: d.name || d.display_name || null,
      properties: d.properties,
      createdAt: d.created_at || null,
      updatedAt: d.updated_at || null,
      reportCard: d.report_card
    }));

    return {
      output: { destinations },
      message:
        destinations.length > 0
          ? `Found destination **${destinations[0]!.name || destinations[0]!.type}** (ID: ${destinations[0]!.destinationId}).`
          : 'No destination configured for this account.'
    };
  })
  .build();

export let createDestination = SlateTool.create(spec, {
  name: 'Create Destination',
  key: 'create_destination',
  description: `Creates a new destination (data warehouse) for the Stitch account. Only one destination can be configured per account. The destination is where Stitch loads replicated data.`,
  instructions: [
    'Use "get_destination" with listTypes=true to find valid destination types and required properties.'
  ],
  constraints: ['Only one destination is supported per Stitch account.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      type: z
        .string()
        .describe('Destination type (e.g., "redshift", "bigquery", "snowflake", "postgres")'),
      name: z.string().optional().describe('Display name for the destination'),
      properties: z
        .record(z.string(), z.any())
        .describe('Connection properties specific to the destination type')
    })
  )
  .output(destinationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let dest = await client.createDestination({
      type: ctx.input.type,
      name: ctx.input.name,
      properties: ctx.input.properties
    });

    return {
      output: {
        destinationId: dest.id,
        type: dest.type,
        name: dest.name || dest.display_name || null,
        properties: dest.properties,
        createdAt: dest.created_at || null,
        updatedAt: dest.updated_at || null,
        reportCard: dest.report_card
      },
      message: `Created destination **${ctx.input.name || ctx.input.type}** (ID: ${dest.id}).`
    };
  })
  .build();

export let updateDestination = SlateTool.create(spec, {
  name: 'Update Destination',
  key: 'update_destination',
  description: `Updates the destination (data warehouse) configuration. Can modify connection properties and name. The destination type cannot be changed after creation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      destinationId: z.number().describe('ID of the destination to update'),
      name: z.string().optional().describe('New display name'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated connection properties')
    })
  )
  .output(destinationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.properties !== undefined) body.properties = ctx.input.properties;

    let dest = await client.updateDestination(ctx.input.destinationId, body);

    return {
      output: {
        destinationId: dest.id,
        type: dest.type,
        name: dest.name || dest.display_name || null,
        properties: dest.properties,
        createdAt: dest.created_at || null,
        updatedAt: dest.updated_at || null,
        reportCard: dest.report_card
      },
      message: `Updated destination **${dest.name || dest.display_name || dest.id}**.`
    };
  })
  .build();

export let deleteDestination = SlateTool.create(spec, {
  name: 'Delete Destination',
  key: 'delete_destination',
  description: `Deletes the destination (data warehouse) from the Stitch account. Replication will be paused until a new destination is configured.`,
  constraints: [
    'This action is irreversible. Replication will stop until a new destination is created.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      destinationId: z.number().describe('ID of the destination to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    await client.deleteDestination(ctx.input.destinationId);

    return {
      output: { success: true },
      message: `Deleted destination with ID **${ctx.input.destinationId}**. Replication is paused until a new destination is created.`
    };
  })
  .build();
