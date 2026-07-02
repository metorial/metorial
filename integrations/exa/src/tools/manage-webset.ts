import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

let websetOutputSchema = z.object({
  websetId: z.string().describe('Webset identifier'),
  status: z.string().describe('Webset status: idle, pending, running, or paused'),
  title: z.string().optional().describe('Webset title'),
  externalId: z.string().optional().describe('External reference identifier'),
  metadata: z.record(z.string(), z.string()).optional().describe('Custom key-value metadata'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let createWebsetTool = SlateTool.create(spec, {
  name: 'Create Webset',
  key: 'create_webset',
  description: `Create a new Webset — a structured collection of web entities discovered by Exa's search agents. Define a search query and criteria; Exa finds matching web entities and verifies them.
Optionally include enrichments to extract additional structured data from found items.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Natural language search description (1-5000 chars)'),
      count: z.number().optional().describe('Target number of results (default: 10)'),
      entity: z
        .enum(['company', 'person', 'article', 'research_paper', 'custom'])
        .optional()
        .describe('Entity type to search for'),
      criteria: z
        .array(
          z.object({
            description: z.string().describe('Criterion description for verifying results')
          })
        )
        .optional()
        .describe('Custom evaluation criteria (max 5)'),
      enrichments: z
        .array(
          z.object({
            description: z.string().describe('Description of data to extract'),
            format: z.string().optional().describe('Expected format of the enrichment value')
          })
        )
        .optional()
        .describe('Data extraction tasks for found items'),
      title: z.string().optional().describe('Custom name for the Webset'),
      externalId: z.string().optional().describe('Your internal identifier (max 300 chars)'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom key-value pairs')
    })
  )
  .output(websetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);

    let searchParam = ctx.input.query
      ? {
          query: ctx.input.query,
          count: ctx.input.count,
          entity: ctx.input.entity,
          criteria: ctx.input.criteria
        }
      : undefined;

    let result = await client.createWebset({
      search: searchParam,
      enrichments: ctx.input.enrichments,
      title: ctx.input.title,
      externalId: ctx.input.externalId,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        websetId: result.id,
        status: result.status,
        title: result.title,
        externalId: result.externalId,
        metadata: result.metadata,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created Webset **${result.id}**${result.title ? ` "${result.title}"` : ''} with status: **${result.status}**.`
    };
  })
  .build();

export let getWebsetTool = SlateTool.create(spec, {
  name: 'Get Webset',
  key: 'get_webset',
  description: `Retrieve details of a specific Webset by its ID, including status, metadata, and associated searches, enrichments, and monitors.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to retrieve')
    })
  )
  .output(
    websetOutputSchema.extend({
      searches: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Associated searches'),
      enrichments: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Associated enrichments'),
      monitors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Associated monitors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.getWebset(ctx.input.websetId);

    return {
      output: {
        websetId: result.id,
        status: result.status,
        title: result.title,
        externalId: result.externalId,
        metadata: result.metadata,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        searches: result.searches,
        enrichments: result.enrichments?.map(e => ({ ...e })),
        monitors: result.monitors
      },
      message: `Webset **${result.id}** is **${result.status}**${result.title ? ` — "${result.title}"` : ''}.`
    };
  })
  .build();

export let listWebsetsTool = SlateTool.create(spec, {
  name: 'List Websets',
  key: 'list_websets',
  description: `List all Websets in your account. Supports cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum number of Websets to return')
    })
  )
  .output(
    z.object({
      websets: z.array(websetOutputSchema).describe('List of Websets'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.listWebsets({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let websets = result.data.map(w => ({
      websetId: w.id,
      status: w.status,
      title: w.title,
      externalId: w.externalId,
      metadata: w.metadata,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }));

    return {
      output: {
        websets,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      },
      message: `Found **${websets.length}** Webset(s).${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let updateWebsetTool = SlateTool.create(spec, {
  name: 'Update Webset',
  key: 'update_webset',
  description: `Update a Webset's title, external ID, or metadata.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to update'),
      title: z.string().optional().describe('New title'),
      externalId: z.string().optional().describe('New external identifier'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated metadata key-value pairs')
    })
  )
  .output(websetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.updateWebset(ctx.input.websetId, {
      title: ctx.input.title,
      externalId: ctx.input.externalId,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        websetId: result.id,
        status: result.status,
        title: result.title,
        externalId: result.externalId,
        metadata: result.metadata,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Updated Webset **${result.id}**.`
    };
  })
  .build();

export let deleteWebsetTool = SlateTool.create(spec, {
  name: 'Delete Webset',
  key: 'delete_webset',
  description: `Permanently delete a Webset and all its items, searches, enrichments, and monitors.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    await client.deleteWebset(ctx.input.websetId);

    return {
      output: { deleted: true },
      message: `Deleted Webset **${ctx.input.websetId}**.`
    };
  })
  .build();

export let cancelWebsetTool = SlateTool.create(spec, {
  name: 'Cancel Webset',
  key: 'cancel_webset',
  description: `Cancel all running operations on a Webset, including active searches and enrichments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to cancel')
    })
  )
  .output(websetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.cancelWebset(ctx.input.websetId);

    return {
      output: {
        websetId: result.id,
        status: result.status,
        title: result.title,
        externalId: result.externalId,
        metadata: result.metadata,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Canceled operations on Webset **${result.id}**. Status: **${result.status}**.`
    };
  })
  .build();
