import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.number().describe('Unique ID of the source'),
  name: z.string().describe('Name of the source'),
  slug: z.string().describe('URL-friendly slug for the source'),
  type: z.string().describe('Source type (e.g. snowflake, postgres, bigquery)'),
  configuration: z.record(z.string(), z.any()).describe('Source connection configuration'),
  workspaceId: z.number().describe('ID of the workspace the source belongs to'),
  createdAt: z.string().describe('ISO timestamp when the source was created'),
  updatedAt: z.string().describe('ISO timestamp when the source was last updated')
});

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List data sources connected to your Hightouch workspace. Sources are the data warehouses, databases, or other systems from which Hightouch pulls data. Supports pagination via limit and offset.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of sources to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      orderBy: z
        .enum(['id', 'name', 'slug', 'createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort results by')
    })
  )
  .output(
    z.object({
      sources: z.array(sourceSchema).describe('List of sources'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSources({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: ctx.input.orderBy
    });

    return {
      output: {
        sources: result.data,
        hasMore: result.hasMore
      },
      message: `Found **${result.data.length}** source(s).${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description: `Retrieve details of a specific data source by its ID, including its type, connection configuration, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to retrieve')
    })
  )
  .output(sourceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let source = await client.getSource(ctx.input.sourceId);

    return {
      output: source,
      message: `Retrieved source **${source.name}** (type: ${source.type}).`
    };
  })
  .build();

export let createSource = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description: `Create a new data source connection in your Hightouch workspace. A source defines where your data lives — a data warehouse, database, or other system that Hightouch will pull data from.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the source'),
      slug: z.string().describe('URL-friendly slug for the source'),
      type: z.string().describe('Source type (e.g. snowflake, postgres, bigquery)'),
      configuration: z
        .record(z.string(), z.any())
        .describe('Source connection configuration (varies by type)')
    })
  )
  .output(sourceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let source = await client.createSource(ctx.input);

    return {
      output: source,
      message: `Created source **${source.name}** (type: ${source.type}, ID: ${source.sourceId}).`
    };
  })
  .build();

export let updateSource = SlateTool.create(spec, {
  name: 'Update Source',
  key: 'update_source',
  description: `Update an existing data source's name or connection configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to update'),
      name: z.string().optional().describe('New name for the source'),
      configuration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated connection configuration')
    })
  )
  .output(sourceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sourceId, ...updateData } = ctx.input;
    let source = await client.updateSource(sourceId, updateData);

    return {
      output: source,
      message: `Updated source **${source.name}** (ID: ${sourceId}).`
    };
  })
  .build();
