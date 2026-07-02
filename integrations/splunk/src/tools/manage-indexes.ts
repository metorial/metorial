import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let listIndexes = SlateTool.create(spec, {
  name: 'List Indexes',
  key: 'list_indexes',
  description: `List data indexes on the Splunk instance. Returns index name, data type, size, event count, retention settings, and status. Supports filtering and pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of indexes to return (default 30)'),
      offset: z.number().optional().describe('Offset for pagination'),
      searchFilter: z.string().optional().describe('Filter string to match index names')
    })
  )
  .output(
    z.object({
      indexes: z.array(
        z.object({
          name: z.string().optional(),
          datatype: z.string().optional(),
          currentDBSizeMB: z.any().optional(),
          maxDataSizeMB: z.any().optional(),
          totalEventCount: z.any().optional(),
          frozenTimePeriodInSecs: z.any().optional(),
          maxTime: z.string().optional(),
          minTime: z.string().optional(),
          homePath: z.string().optional(),
          isInternal: z.any().optional(),
          disabled: z.any().optional()
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let response = await client.listIndexes({
      count: ctx.input.count,
      offset: ctx.input.offset,
      searchFilter: ctx.input.searchFilter
    });

    return {
      output: response,
      message: `Found **${response.total}** indexes. Returned **${response.indexes.length}**.`
    };
  })
  .build();

export let createIndex = SlateTool.create(spec, {
  name: 'Create Index',
  key: 'create_index',
  description: `Create a new data index on the Splunk instance. Configure data type (event or metric), storage paths, max data size, and retention period.`,
  constraints: [
    'Requires admin or equivalent role with indexes_edit capability.',
    'Not supported on all Splunk Cloud Platform deployments.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the index to create'),
      datatype: z.enum(['event', 'metric']).optional().describe('Data type for the index'),
      maxDataSizeMB: z.number().optional().describe('Maximum data size in MB'),
      frozenTimePeriodInSecs: z
        .number()
        .optional()
        .describe('Retention period in seconds before data is frozen')
    })
  )
  .output(
    z.object({
      name: z.string().optional(),
      datatype: z.string().optional(),
      homePath: z.string().optional(),
      maxDataSizeMB: z.any().optional(),
      frozenTimePeriodInSecs: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.createIndex({
      name: ctx.input.name,
      datatype: ctx.input.datatype,
      maxDataSizeMB: ctx.input.maxDataSizeMB,
      frozenTimePeriodInSecs: ctx.input.frozenTimePeriodInSecs
    });

    return {
      output: result,
      message: `Index **${ctx.input.name}** created successfully.`
    };
  })
  .build();

export let getIndex = SlateTool.create(spec, {
  name: 'Get Index',
  key: 'get_index',
  description: `Get detailed information about a specific Splunk index including size, event count, time range, retention policy, and storage paths.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      indexName: z.string().describe('Name of the index to retrieve')
    })
  )
  .output(
    z.object({
      name: z.string().optional(),
      datatype: z.string().optional(),
      currentDBSizeMB: z.any().optional(),
      maxDataSizeMB: z.any().optional(),
      totalEventCount: z.any().optional(),
      frozenTimePeriodInSecs: z.any().optional(),
      maxTime: z.string().optional(),
      minTime: z.string().optional(),
      homePath: z.string().optional(),
      isInternal: z.any().optional(),
      disabled: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.getIndex(ctx.input.indexName);

    return {
      output: result,
      message: `Index **${ctx.input.indexName}**: ${result.totalEventCount ?? 0} events, ${result.currentDBSizeMB ?? 0} MB.`
    };
  })
  .build();
