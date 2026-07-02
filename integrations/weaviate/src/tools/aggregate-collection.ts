import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let aggregateCollection = SlateTool.create(spec, {
  name: 'Aggregate Collection',
  key: 'aggregate_collection',
  description: `Run aggregation queries over a collection to compute metrics like counts, sums, averages, min/max, top occurrences, and more. Supports grouping by a property and filtering with a where clause.
Provide the raw GraphQL aggregation body for full flexibility, or use the simplified parameters.`,
  instructions: [
    'For text properties: count, topOccurrences { value occurs }',
    'For number/int properties: count, minimum, maximum, mean, median, mode, sum',
    'For boolean properties: count, totalTrue, totalFalse, percentageTrue, percentageFalse',
    'For date properties: count, minimum, maximum, mean, median, mode'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to aggregate'),
      graphqlBody: z
        .string()
        .describe(
          'GraphQL body for the aggregation query inside the collection block. Example: "meta { count } wordCount { mean maximum }"'
        ),
      where: z.any().optional().describe('Where filter for pre-aggregation filtering'),
      groupBy: z.array(z.string()).optional().describe('Properties to group by'),
      nearText: z
        .object({
          concepts: z.array(z.string()),
          certainty: z.number().optional(),
          distance: z.number().optional()
        })
        .optional()
        .describe('Narrow aggregation to semantically similar objects'),
      objectLimit: z
        .number()
        .optional()
        .describe('Limit the number of objects considered when using nearText'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections'),
      limit: z
        .number()
        .optional()
        .describe('Limit number of groups returned when using groupBy')
    })
  )
  .output(
    z.object({
      aggregation: z.any().describe('Aggregation results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, graphqlBody, where, groupBy, nearText, objectLimit, tenant, limit } =
      ctx.input;

    let args: string[] = [];

    if (where) {
      args.push(`where: ${JSON.stringify(where).replace(/"(\w+)":/g, '$1:')}`);
    }
    if (groupBy && groupBy.length > 0) {
      args.push(`groupBy: ${JSON.stringify(groupBy)}`);
    }
    if (nearText) {
      let ntParts: string[] = [`concepts: ${JSON.stringify(nearText.concepts)}`];
      if (nearText.certainty !== undefined) ntParts.push(`certainty: ${nearText.certainty}`);
      if (nearText.distance !== undefined) ntParts.push(`distance: ${nearText.distance}`);
      args.push(`nearText: { ${ntParts.join(', ')} }`);
    }
    if (objectLimit !== undefined) args.push(`objectLimit: ${objectLimit}`);
    if (tenant) args.push(`tenant: "${tenant}"`);
    if (limit !== undefined) args.push(`limit: ${limit}`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

    // Add groupedBy field when groupBy is used
    let groupedByField = groupBy && groupBy.length > 0 ? 'groupedBy { value path }' : '';

    let query = `{
      Aggregate {
        ${collectionName}${argsStr} {
          ${groupedByField}
          ${graphqlBody}
        }
      }
    }`;

    let result = await client.graphql(query);

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    let aggregation = result.data?.Aggregate?.[collectionName];

    return {
      output: { aggregation },
      message: `Aggregation on **${collectionName}** completed.`
    };
  })
  .build();
