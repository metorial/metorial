import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let connectionSchema = z.object({
  connectionId: z.number().describe('Unique identifier of the connection.'),
  name: z.string().describe('Service name or identifier (e.g., "snowflake", "hubspot").'),
  label: z.string().nullable().describe('User-defined label for the connection.'),
  type: z.string().describe('Type of connection.'),
  createdAt: z.string().describe('When the connection was created.'),
  updatedAt: z.string().describe('When the connection was last updated.')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Lists source connections (data warehouses like Snowflake, BigQuery, Redshift) and/or destination connections (SaaS tools like Salesforce, HubSpot, Braze). Specify the connection type to filter, or retrieve both.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionType: z
        .enum(['sources', 'destinations', 'both'])
        .optional()
        .default('both')
        .describe('Which type of connections to list.'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      perPage: z.number().optional().describe('Results per page (max 100).')
    })
  )
  .output(
    z.object({
      sources: z
        .array(connectionSchema)
        .optional()
        .describe('Source connections (data warehouses).'),
      destinations: z
        .array(connectionSchema)
        .optional()
        .describe('Destination connections (SaaS tools).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let paginationParams = {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    };

    let sources:
      | Array<{
          connectionId: number;
          name: string;
          label: string | null;
          type: string;
          createdAt: string;
          updatedAt: string;
        }>
      | undefined;
    let destinations:
      | Array<{
          connectionId: number;
          name: string;
          label: string | null;
          type: string;
          createdAt: string;
          updatedAt: string;
        }>
      | undefined;

    if (ctx.input.connectionType === 'sources' || ctx.input.connectionType === 'both') {
      let result = await client.listSources(paginationParams);
      sources = result.sources.map(s => ({
        connectionId: s.id,
        name: s.name,
        label: s.label,
        type: s.type,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }));
    }

    if (ctx.input.connectionType === 'destinations' || ctx.input.connectionType === 'both') {
      let result = await client.listDestinations(paginationParams);
      destinations = result.destinations.map(d => ({
        connectionId: d.id,
        name: d.name,
        label: d.label,
        type: d.type,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));
    }

    let parts: string[] = [];
    if (sources) parts.push(`**${sources.length}** source(s)`);
    if (destinations) parts.push(`**${destinations.length}** destination(s)`);

    return {
      output: {
        sources,
        destinations
      },
      message: `Found ${parts.join(' and ')}.`
    };
  })
  .build();
