import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let queryObjects = SlateTool.create(spec, {
  name: 'Query Objects',
  key: 'query_objects',
  description: `Retrieves objects from a Backendless database table with powerful SQL-like filtering, sorting, pagination, and relation loading. Can also fetch a single object by its ID or return the count of matching objects.`,
  instructions: [
    "Use the `where` parameter for SQL-like filtering, e.g. `age > 21 AND name LIKE 'John%'`.",
    'Use `sortBy` with a prefix of `-` for descending order, e.g. `["-created"]`.',
    'Set `countOnly` to true to get just the count of matching objects without fetching them.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the database table to query'),
      objectId: z
        .string()
        .optional()
        .describe(
          'Fetch a single object by its ID. If provided, other query parameters are ignored.'
        ),
      where: z
        .string()
        .optional()
        .describe(
          'SQL-like where clause for filtering results, e.g. "age > 21 AND status = \'active\'"'
        ),
      sortBy: z
        .array(z.string())
        .optional()
        .describe(
          'Properties to sort by. Prefix with "-" for descending, e.g. ["-created", "name"]'
        ),
      props: z
        .array(z.string())
        .optional()
        .describe('Specific properties/columns to return. Returns all properties if omitted.'),
      excludeProps: z
        .array(z.string())
        .optional()
        .describe('Properties to exclude from the response'),
      loadRelations: z
        .array(z.string())
        .optional()
        .describe('Related object properties to load'),
      relationsDepth: z.number().optional().describe('Depth of nested relations to load'),
      pageSize: z.number().optional().describe('Number of objects per page (default: 100)'),
      offset: z.number().optional().describe('Zero-based starting index for pagination'),
      groupBy: z.array(z.string()).optional().describe('Columns to group results by'),
      having: z.string().optional().describe('Filter condition for grouped results'),
      distinct: z.string().optional().describe('Column to return unique values for'),
      countOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only the count of matching objects')
    })
  )
  .output(
    z.object({
      objects: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of matching objects'),
      singleObject: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single object when queried by ID'),
      count: z
        .number()
        .describe('Number of objects returned or total count if countOnly is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    if (ctx.input.objectId) {
      let obj = await client.getObjectById(ctx.input.tableName, ctx.input.objectId, {
        loadRelations: ctx.input.loadRelations,
        relationsDepth: ctx.input.relationsDepth,
        props: ctx.input.props
      });
      return {
        output: {
          singleObject: obj,
          count: 1
        },
        message: `Retrieved object **${ctx.input.objectId}** from table **${ctx.input.tableName}**.`
      };
    }

    if (ctx.input.countOnly) {
      let count = await client.getObjectCount(ctx.input.tableName, ctx.input.where);
      return {
        output: {
          count
        },
        message: `Found **${count}** objects in table **${ctx.input.tableName}**${ctx.input.where ? ` matching \`${ctx.input.where}\`` : ''}.`
      };
    }

    let objects = await client.queryObjects(ctx.input.tableName, {
      where: ctx.input.where,
      sortBy: ctx.input.sortBy,
      props: ctx.input.props,
      excludeProps: ctx.input.excludeProps,
      loadRelations: ctx.input.loadRelations,
      relationsDepth: ctx.input.relationsDepth,
      pageSize: ctx.input.pageSize,
      offset: ctx.input.offset,
      groupBy: ctx.input.groupBy,
      having: ctx.input.having,
      distinct: ctx.input.distinct
    });

    return {
      output: {
        objects,
        count: objects.length
      },
      message: `Retrieved **${objects.length}** objects from table **${ctx.input.tableName}**${ctx.input.where ? ` matching \`${ctx.input.where}\`` : ''}.`
    };
  })
  .build();
