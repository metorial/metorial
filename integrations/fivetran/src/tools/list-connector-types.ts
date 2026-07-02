import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let connectorTypeSchema = z.object({
  serviceId: z.string().describe('Service identifier used when creating connections'),
  name: z.string().describe('Human-readable name of the connector'),
  type: z.string().optional().describe('Category (e.g., "Engineering", "Marketing")'),
  description: z.string().optional().describe('Description of the connector'),
  iconUrl: z.string().optional().describe('URL to the connector icon'),
  serviceStatus: z
    .string()
    .optional()
    .describe('Availability status (general_availability, beta, sunset, etc.)'),
  connectorClass: z.string().optional().describe('Connector class (standard, lite, etc.)'),
  docsUrl: z.string().optional().describe('Link to the connector documentation')
});

export let listConnectorTypes = SlateTool.create(spec, {
  name: 'List Connector Types',
  key: 'list_connector_types',
  description: `List all available connector (source) types supported by Fivetran. Use this to discover available services and their IDs when creating new connections.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      connectorTypes: z
        .array(connectorTypeSchema)
        .describe('List of available connector types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let items = await client.listConnectorTypes();

    let connectorTypes = items.map((ct: any) => ({
      serviceId: ct.id,
      name: ct.name,
      type: ct.type,
      description: ct.description,
      iconUrl: ct.icon_url,
      serviceStatus: ct.service_status,
      connectorClass: ct.connector_class,
      docsUrl: ct.link_to_docs
    }));

    return {
      output: { connectorTypes },
      message: `Found **${connectorTypes.length}** connector type(s).`
    };
  })
  .build();

export let getConnectorType = SlateTool.create(spec, {
  name: 'Get Connector Type',
  key: 'get_connector_type',
  description: `Retrieve detailed metadata about a specific connector type, including its configuration requirements and supported features.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z
        .string()
        .describe('Service identifier (e.g., "github", "salesforce", "google_sheets")')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('Service identifier'),
      name: z.string().describe('Human-readable name'),
      type: z.string().optional().describe('Category'),
      description: z.string().optional().describe('Description'),
      iconUrl: z.string().optional().describe('Icon URL'),
      serviceStatus: z.string().optional().describe('Availability status'),
      connectorClass: z.string().optional().describe('Connector class'),
      docsUrl: z.string().optional().describe('Documentation URL'),
      erdUrl: z.string().optional().describe('ERD documentation URL'),
      supportedFeatures: z.array(z.string()).optional().describe('List of supported features')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let ct = await client.getConnectorType(ctx.input.serviceId);

    return {
      output: {
        serviceId: ct.id,
        name: ct.name,
        type: ct.type,
        description: ct.description,
        iconUrl: ct.icon_url,
        serviceStatus: ct.service_status,
        connectorClass: ct.connector_class,
        docsUrl: ct.link_to_docs,
        erdUrl: ct.link_to_erd,
        supportedFeatures: ct.supported_features
      },
      message: `Retrieved connector type **${ct.name}** (${ct.id}).`
    };
  })
  .build();
