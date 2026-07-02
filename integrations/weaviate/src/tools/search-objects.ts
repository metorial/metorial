import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let buildWhereClause = (filter: any): string => {
  if (!filter) return '';
  return `where: ${JSON.stringify(filter).replace(/"(\w+)":/g, '$1:')}`;
};

let buildSearchOperator = (input: any): string => {
  if (input.nearText) {
    let params: string[] = [`concepts: ${JSON.stringify(input.nearText.concepts)}`];
    if (input.nearText.distance !== undefined)
      params.push(`distance: ${input.nearText.distance}`);
    if (input.nearText.certainty !== undefined)
      params.push(`certainty: ${input.nearText.certainty}`);
    return `nearText: { ${params.join(', ')} }`;
  }
  if (input.nearVector) {
    let params: string[] = [`vector: [${input.nearVector.vector.join(', ')}]`];
    if (input.nearVector.distance !== undefined)
      params.push(`distance: ${input.nearVector.distance}`);
    if (input.nearVector.certainty !== undefined)
      params.push(`certainty: ${input.nearVector.certainty}`);
    return `nearVector: { ${params.join(', ')} }`;
  }
  if (input.nearObject) {
    let params: string[] = [`id: "${input.nearObject.objectId}"`];
    if (input.nearObject.distance !== undefined)
      params.push(`distance: ${input.nearObject.distance}`);
    return `nearObject: { ${params.join(', ')} }`;
  }
  if (input.hybrid) {
    let params: string[] = [`query: "${input.hybrid.query.replace(/"/g, '\\"')}"`];
    if (input.hybrid.alpha !== undefined) params.push(`alpha: ${input.hybrid.alpha}`);
    if (input.hybrid.vector) params.push(`vector: [${input.hybrid.vector.join(', ')}]`);
    if (input.hybrid.properties)
      params.push(`properties: ${JSON.stringify(input.hybrid.properties)}`);
    if (input.hybrid.fusionType) params.push(`fusionType: ${input.hybrid.fusionType}`);
    return `hybrid: { ${params.join(', ')} }`;
  }
  if (input.bm25) {
    let params: string[] = [`query: "${input.bm25.query.replace(/"/g, '\\"')}"`];
    if (input.bm25.properties)
      params.push(`properties: ${JSON.stringify(input.bm25.properties)}`);
    return `bm25: { ${params.join(', ')} }`;
  }
  return '';
};

export let searchObjects = SlateTool.create(spec, {
  name: 'Search Objects',
  key: 'search_objects',
  description: `Search for objects in a Weaviate collection using various search methods:
- **nearText**: Semantic search using natural language concepts (requires a text vectorizer)
- **nearVector**: Search by raw vector similarity
- **nearObject**: Find objects similar to an existing object
- **hybrid**: Combined vector + keyword search with configurable weighting
- **bm25**: Pure keyword search using BM25 ranking

Exactly one search method must be provided. Results can be filtered with a where clause and paginated with limit/offset.`,
  instructions: [
    'Provide exactly one search method: nearText, nearVector, nearObject, hybrid, or bm25.',
    'The properties array determines which fields are returned in results.',
    'Use the where filter for scalar filtering (date ranges, property values, etc.).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to search'),
      properties: z
        .array(z.string())
        .describe('Properties to return in results (e.g. ["title", "content"])'),
      nearText: z
        .object({
          concepts: z.array(z.string()).describe('Natural language concepts to search for'),
          distance: z.number().optional().describe('Maximum distance threshold'),
          certainty: z
            .number()
            .optional()
            .describe('Minimum certainty threshold (0-1, cosine only)')
        })
        .optional()
        .describe('Semantic text search'),
      nearVector: z
        .object({
          vector: z.array(z.number()).describe('Query vector for similarity search'),
          distance: z.number().optional().describe('Maximum distance threshold'),
          certainty: z.number().optional().describe('Minimum certainty threshold')
        })
        .optional()
        .describe('Raw vector similarity search'),
      nearObject: z
        .object({
          objectId: z.string().describe('UUID of the reference object'),
          distance: z.number().optional().describe('Maximum distance threshold')
        })
        .optional()
        .describe('Similar object search'),
      hybrid: z
        .object({
          query: z.string().describe('Search query string'),
          alpha: z
            .number()
            .optional()
            .describe('Balance between keyword (0) and vector (1) search. Default: 0.75'),
          vector: z
            .array(z.number())
            .optional()
            .describe('Custom vector for the vector component'),
          properties: z
            .array(z.string())
            .optional()
            .describe('Properties to search for keyword component'),
          fusionType: z
            .enum(['rankedFusion', 'relativeScoreFusion'])
            .optional()
            .describe('Score fusion method')
        })
        .optional()
        .describe('Hybrid vector + keyword search'),
      bm25: z
        .object({
          query: z.string().describe('Keyword search query'),
          properties: z
            .array(z.string())
            .optional()
            .describe(
              'Properties to search (supports boosting with ^ notation, e.g. "title^3")'
            )
        })
        .optional()
        .describe('BM25 keyword search'),
      where: z
        .any()
        .optional()
        .describe(
          'Where filter object for scalar conditions (e.g. { path: ["price"], operator: "GreaterThan", valueNumber: 10 })'
        ),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections'),
      includeVector: z.boolean().optional().describe('Include vector embeddings in results'),
      autocut: z
        .number()
        .optional()
        .describe('Automatically limit results based on score jumps')
    })
  )
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            objectId: z.string().optional().describe('Object UUID'),
            distance: z.number().optional().describe('Vector distance from query'),
            certainty: z.number().optional().describe('Certainty score'),
            score: z.string().optional().describe('BM25/hybrid score'),
            properties: z.record(z.string(), z.any()).describe('Object properties'),
            vector: z.array(z.number()).optional().describe('Vector embedding')
          })
        )
        .describe('Search results'),
      totalResults: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, properties, limit, offset, tenant, includeVector, autocut } =
      ctx.input;

    let searchOp = buildSearchOperator(ctx.input);

    // Build arguments list
    let args: string[] = [];
    if (searchOp) args.push(searchOp);
    if (ctx.input.where) args.push(buildWhereClause(ctx.input.where));
    if (limit !== undefined) args.push(`limit: ${limit}`);
    if (offset !== undefined) args.push(`offset: ${offset}`);
    if (autocut !== undefined) args.push(`autocut: ${autocut}`);
    if (tenant) args.push(`tenant: "${tenant}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

    // Build additional fields
    let additionalFields: string[] = ['id'];
    if (includeVector) additionalFields.push('vector');
    if (ctx.input.nearText || ctx.input.nearVector || ctx.input.nearObject) {
      additionalFields.push('distance', 'certainty');
    }
    if (ctx.input.hybrid || ctx.input.bm25) {
      additionalFields.push('score');
    }

    let propsStr = properties.join('\n          ');

    let query = `{
      Get {
        ${collectionName}${argsStr} {
          ${propsStr}
          _additional {
            ${additionalFields.join('\n            ')}
          }
        }
      }
    }`;

    let result = await client.graphql(query);

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    let objects = (result.data?.Get?.[collectionName] || []).map((obj: any) => {
      let { _additional, ...props } = obj;
      return {
        objectId: _additional?.id,
        distance: _additional?.distance,
        certainty: _additional?.certainty,
        score: _additional?.score,
        properties: props,
        vector: _additional?.vector
      };
    });

    return {
      output: {
        objects,
        totalResults: objects.length
      },
      message: `Found **${objects.length}** result(s) in **${collectionName}**.`
    };
  })
  .build();
