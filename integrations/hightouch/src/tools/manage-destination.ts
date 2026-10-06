import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { destinationSchema } from '../lib/schemas';
import { spec } from '../spec';

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
      name: z.string().optional().describe('Filter by resource name'),
      slug: z.string().optional().describe('Filter by resource slug'),
      orderBy: z
        .enum(['id', 'name', 'slug', 'createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort results by')
    })
  )
  .output(
    z.object({
      destinations: z.array(destinationSchema).describe('List of destinations'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextOffset: z.number().optional().describe('Offset for the next page, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDestinations({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: ctx.input.orderBy,
      name: ctx.input.name,
      slug: ctx.input.slug
    });

    return {
      output: {
        destinations: result.data,
        hasMore: result.hasMore,
        nextOffset: result.nextOffset
      },
      message: `Found **${result.data.length}** destination(s).${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let getDestination = SlateTool.create(spec, {
  name: 'Get Destination',
  key: 'get_destination',
  description: `Retrieve details of a specific destination by its ID, including its type and associated syncs. Connection configuration is omitted to protect credentials.`,
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
    destructive: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the destination'),
      slug: z.string().describe('URL-friendly slug for the destination'),
      type: z.string().describe('Destination type (e.g. salesforce, hubspot, google_ads)'),
      configuration: z
        .record(z.string(), z.unknown())
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
    destructive: true
  }
})
  .input(
    z.object({
      destinationId: z.number().describe('ID of the destination to update'),
      name: z.string().optional().describe('New name for the destination'),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated configuration')
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
