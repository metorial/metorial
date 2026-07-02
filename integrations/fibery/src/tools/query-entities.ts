import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryEntitiesTool = SlateTool.create(spec, {
  name: 'Query Entities',
  key: 'query_entities',
  description: `Query entities from any Type (database) in the Fibery workspace. Supports field selection, filtering with operators, ordering, and pagination. Can traverse relations to include nested entity data.`,
  instructions: [
    'Use "get_schema" first to discover available types and fields.',
    'Field names must be fully qualified (e.g., "Project/Name", "fibery/id").',
    'Always include "fibery/id" in select to identify entities.',
    'For relation fields, use nested selection: {"Relation/Field": ["fibery/id", "Target/Name"]}.',
    'Filter operators: "=", "!=", "<", "<=", ">", ">=", "q/contains", "q/not-contains", "q/in", "q/not-in". Combine with "q/and" or "q/or".',
    'Use queryParams to pass named parameters (prefixed with "$") referenced in the where clause.'
  ],
  constraints: [
    'Maximum results per query depend on workspace plan. Use limit and offset for pagination.',
    'Rate limit: 3 requests per second per token.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      typeName: z
        .string()
        .describe('Fully qualified type name (e.g., "Project Management/Task")'),
      select: z
        .array(z.any())
        .describe(
          'Fields to return. Array of field name strings or nested objects for relations (e.g., ["fibery/id", "Task/Name", {"Task/Assignee": ["fibery/id", "user/name"]}])'
        ),
      where: z
        .any()
        .optional()
        .describe(
          'Filter expression (e.g., ["=", ["Task/Status"], "$status"] or ["q/and", [">=", ["Task/Priority"], 3], ["!=", ["Task/Name"], ""]])'
        ),
      orderBy: z
        .array(z.any())
        .optional()
        .describe(
          'Ordering rules (e.g., [["Task/Priority", "q/desc"], ["Task/Name", "q/asc"]])'
        ),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of entities to return (default: 50)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of entities to skip for pagination (default: 0)'),
      queryParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Named parameters for where clause (e.g., {"$status": "In Progress"})')
    })
  )
  .output(
    z.object({
      entities: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of matching entities with selected fields'),
      count: z.number().describe('Number of entities returned in this response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    let entities = await client.queryEntities({
      typeName: ctx.input.typeName,
      select: ctx.input.select,
      where: ctx.input.where,
      orderBy: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      queryParams: ctx.input.queryParams
    });

    return {
      output: {
        entities,
        count: entities.length
      },
      message: `Returned **${entities.length}** entities of type **${ctx.input.typeName}**.`
    };
  })
  .build();
