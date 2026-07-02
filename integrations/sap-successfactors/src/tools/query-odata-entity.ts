import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryOdataEntity = SlateTool.create(spec, {
  name: 'Query OData Entity',
  key: 'query_odata_entity',
  description: `Execute a generic OData query against any SAP SuccessFactors entity set. This is a flexible tool for accessing any entity exposed through the OData v2 API, including custom MDF entities and picklists. Use this when the specialized tools don't cover your specific entity or use case.`,
  instructions: [
    'Entity set names are case-sensitive (e.g., "User", "EmpJob", "FODepartment")',
    'Use OData v2 filter syntax for the filter parameter',
    'For entities with compound keys, provide the keys as a JSON object',
    'All MDF (Metadata Framework) entities are automatically available'
  ],
  constraints: ['Maximum 1000 records per request typically enforced by SAP'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entitySet: z
        .string()
        .describe('The OData entity set name (e.g., "User", "EmpJob", "cust_myCustomEntity")'),
      entityKey: z
        .string()
        .optional()
        .describe('Simple key value to retrieve a specific entity'),
      compoundKeys: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .optional()
        .describe('Compound key fields for entities with multiple key properties'),
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z.string().optional().describe('Navigation properties to expand'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order (e.g., "lastModifiedDateTime desc")'),
      top: z.number().optional().describe('Maximum records to return').default(100),
      skip: z.number().optional().describe('Number of records to skip'),
      includeCount: z
        .boolean()
        .optional()
        .describe('Include total record count')
        .default(false)
    })
  )
  .output(
    z.object({
      entity: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single entity record (when key is provided)'),
      entities: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of entity records (when querying)'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let queryOptions = {
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      skip: ctx.input.skip,
      inlineCount: ctx.input.includeCount
    };

    if (ctx.input.entityKey) {
      let entity = await client.getEntity(
        ctx.input.entitySet,
        ctx.input.entityKey,
        queryOptions
      );
      return {
        output: { entity },
        message: `Retrieved **${ctx.input.entitySet}** entity with key '${ctx.input.entityKey}'`
      };
    }

    if (ctx.input.compoundKeys && Object.keys(ctx.input.compoundKeys).length > 0) {
      let entity = await client.getEntityByCompoundKey(
        ctx.input.entitySet,
        ctx.input.compoundKeys as Record<string, string | number>,
        queryOptions
      );
      return {
        output: { entity },
        message: `Retrieved **${ctx.input.entitySet}** entity`
      };
    }

    let result = await client.queryEntities(ctx.input.entitySet, queryOptions);

    return {
      output: {
        entities: result.results,
        totalCount: result.count
      },
      message: `Found **${result.results.length}** ${ctx.input.entitySet} records${result.count !== undefined ? ` (${result.count} total)` : ''}`
    };
  })
  .build();
