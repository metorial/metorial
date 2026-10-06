import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/helpers';
import { spec } from '../spec';

export let queryOdataEntity = SlateTool.create(spec, {
  name: 'Query OData Entity',
  key: 'query_odata_entity',
  description: `Execute a generic OData query against any SAP SuccessFactors entity set. This is a flexible tool for accessing any entity exposed through the OData v2 API, including custom MDF entities and picklists. Use this when the specialized tools don't cover your specific entity or use case.`,
  instructions: [
    'Entity set names are case-sensitive (e.g., "User", "EmpJob", "FODepartment")',
    'Use OData v2 filter syntax for the filter parameter',
    'For entities with compound keys, provide the keys as a JSON object',
    'Only entity sets exposed by the company metadata and authorized for the API user are available; call get_api_metadata first'
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
      asOfDate: z
        .string()
        .optional()
        .describe(
          'Effective date in YYYY-MM-DD. Without a date range SAP normally returns records effective today.'
        ),
      fromDate: z
        .string()
        .optional()
        .describe('Start of effective-date range; cannot combine with asOfDate.'),
      toDate: z
        .string()
        .optional()
        .describe('End of effective-date range; cannot combine with asOfDate.'),
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z.string().optional().describe('Navigation properties to expand'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order (e.g., "lastModifiedDateTime desc")'),
      top: z.number().optional().describe('Maximum records to return').default(100),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
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
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    if (ctx.input.entityKey !== undefined && ctx.input.compoundKeys !== undefined)
      throw invalid('Use entityKey or compoundKeys, not both.');
    if (
      (ctx.input.entityKey !== undefined || ctx.input.compoundKeys !== undefined) &&
      ctx.input.top !== 100
    )
      throw invalid('A keyed read cannot use collection pagination.');
    let queryOptions = {
      asOfDate: ctx.input.asOfDate,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      inlineCount: ctx.input.includeCount
    };

    if (ctx.input.entityKey !== undefined) {
      let entity = await client.getEntity(
        ctx.input.entitySet,
        ctx.input.entityKey,
        queryOptions
      );
      return {
        output: { entity },
        message: 'Retrieved the requested entity.'
      };
    }

    if (ctx.input.compoundKeys !== undefined) {
      let entity = await client.getEntityByCompoundKey(
        ctx.input.entitySet,
        ctx.input.compoundKeys,
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
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Found **${result.results.length}** ${ctx.input.entitySet} records${result.count !== undefined ? ` (${result.count} total)` : ''}`
    };
  })
  .build();
