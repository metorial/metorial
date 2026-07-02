import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let destinationSchema = z.object({
  destinationId: z.number().describe('Unique ID of the destination'),
  name: z.string().describe('Name of the destination'),
  slug: z.string().describe('URL-friendly slug for the destination'),
  type: z.string().describe('Destination type (e.g. salesforce, hubspot)'),
  configuration: z.record(z.string(), z.any()).describe('Destination configuration metadata'),
  syncs: z
    .array(z.number())
    .optional()
    .describe('IDs of syncs sending data to this destination'),
  workspaceId: z.number().describe('ID of the workspace the destination belongs to'),
  createdAt: z.string().describe('ISO timestamp when the destination was created'),
  updatedAt: z.string().describe('ISO timestamp when the destination was last updated')
});

export let listDestinations = SlateTool.create(spec, {
  name: 'List Destinations',
  key: 'list_destinations',
  description: `List all destinations configured in your Hightouch workspace. Destinations are the SaaS tools and services (CRMs, ad platforms, marketing tools, etc.) where Hightouch sends data. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Max number of destinations to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      orderBy: z
        .enum(['id', 'name', 'slug', 'createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort results by')
    })
  )
  .output(
    z.object({
      destinations: z.array(destinationSchema).describe('List of destinations'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDestinations({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: ctx.input.orderBy
    });

    return {
      output: {
        destinations: result.data,
        hasMore: result.hasMore
      },
      message: `Found **${result.data.length}** destination(s).${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let getDestination = SlateTool.create(spec, {
  name: 'Get Destination',
  key: 'get_destination',
  description: `Retrieve details of a specific destination by its ID, including its type, configuration, and associated syncs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      destinationId: z.number().describe('ID of the destination to retrieve')
    })
  )
  .output(destinationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let destination = await client.getDestination(ctx.input.destinationId);

    return {
      output: destination,
      message: `Retrieved destination **${destination.name}** (type: ${destination.type}).`
    };
  })
  .build();

export let createDestination = SlateTool.create(spec, {
  name: 'Create Destination',
  key: 'create_destination',
  description: `Create a new destination in your Hightouch workspace. A destination is any tool or service you want to send data to, such as Salesforce, HubSpot, Google Ads, or any of 200+ supported destinations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the destination'),
      slug: z.string().describe('URL-friendly slug for the destination'),
      type: z.string().describe('Destination type (e.g. salesforce, hubspot, google_ads)'),
      configuration: z
        .record(z.string(), z.any())
        .describe('Destination configuration (varies by type)')
    })
  )
  .output(destinationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let destination = await client.createDestination(ctx.input);

    return {
      output: destination,
      message: `Created destination **${destination.name}** (type: ${destination.type}, ID: ${destination.destinationId}).`
    };
  })
  .build();

export let updateDestination = SlateTool.create(spec, {
  name: 'Update Destination',
  key: 'update_destination',
  description: `Update an existing destination's name or configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      destinationId: z.number().describe('ID of the destination to update'),
      name: z.string().optional().describe('New name for the destination'),
      configuration: z.record(z.string(), z.any()).optional().describe('Updated configuration')
    })
  )
  .output(destinationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { destinationId, ...updateData } = ctx.input;
    let destination = await client.updateDestination(destinationId, updateData);

    return {
      output: destination,
      message: `Updated destination **${destination.name}** (ID: ${destinationId}).`
    };
  })
  .build();
