import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let fetchXmlQuery = SlateTool.create(spec, {
  name: 'FetchXML Query',
  key: 'fetch_xml_query',
  description: `Execute a FetchXML query against a Dynamics 365 entity. FetchXML is a proprietary query language that supports aggregation, grouping, and complex joins that are not possible with standard OData queries.`,
  instructions: [
    'Provide the full FetchXML string including the <fetch> root element.',
    'The entitySetName must match the entity referenced in the FetchXML.',
    'FetchXML supports aggregate functions like count, sum, avg, min, max via the "aggregate" attribute.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entitySetName: z.string().describe('OData entity set name matching the FetchXML entity'),
      fetchXml: z.string().describe('Complete FetchXML query string')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Query result records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let records = await client.fetchXml(ctx.input.entitySetName, ctx.input.fetchXml);

    return {
      output: { records },
      message: `FetchXML query returned **${records.length}** records from **${ctx.input.entitySetName}**.`
    };
  })
  .build();
