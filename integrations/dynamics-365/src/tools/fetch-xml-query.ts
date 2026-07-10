import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient, dataverseContinuation } from '../lib/client';
import { spec } from '../spec';

export let fetchXmlQuery = SlateTool.create(spec, {
  name: 'FetchXML Query',
  key: 'fetch_xml_query',
  description: `Execute a FetchXML query against a Dynamics 365 Dataverse table. FetchXML supports aggregation, grouping, and complex joins that are not possible with standard OData queries.`,
  instructions: [
    'Provide the full FetchXML string including the <fetch> root element.',
    'The entitySetName must match the entity referenced in the FetchXML.',
    'FetchXML supports aggregate functions like count, sum, avg, min, max via the "aggregate" attribute.',
    'To paginate, pass the nextLink value from the previous response back as nextLink.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entitySetName: z.string().describe('OData entity set name matching the FetchXML entity'),
      fetchXml: z.string().describe('Complete FetchXML query string'),
      pageSize: z.number().int().positive().optional().describe('Preferred page size'),
      nextLink: z
        .string()
        .optional()
        .describe(
          'Pagination URL from a previous response; when set, fetches the next page instead of re-running the query'
        )
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('OData entity set name queried'),
      records: z.array(z.record(z.string(), z.any())).describe('Query result records'),
      nextLink: z
        .string()
        .nullable()
        .describe('Pagination URL for the next page of results, or null if no more pages'),
      continuation: z
        .object({
          nextLink: z.string().nullable()
        })
        .describe('Continuation metadata for downstream pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let result = await client.fetchXml(ctx.input.entitySetName, ctx.input.fetchXml, {
      pageSize: ctx.input.pageSize,
      nextLink: ctx.input.nextLink
    });

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        records: result.records,
        nextLink: result.nextLink,
        continuation: dataverseContinuation(result)
      },
      message: `FetchXML query returned **${result.records.length}** records from **${ctx.input.entitySetName}**.`
    };
  })
  .build();
