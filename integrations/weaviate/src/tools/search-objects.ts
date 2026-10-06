import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { graphqlValue, validateCollectionName, validateDistance } from '../lib/graphql';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let buildWhereClause = (filter: any): string => {
  if (!filter) return '';
  return `where: ${graphqlValue(filter)}`;
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
    let params: string[] = [`id: ${JSON.stringify(input.nearObject.objectId)}`];
    if (input.nearObject.distance !== undefined)
      params.push(`distance: ${input.nearObject.distance}`);
    return `nearObject: { ${params.join(', ')} }`;
  }
  if (input.hybrid) {
    let params: string[] = [`query: ${JSON.stringify(input.hybrid.query)}`];
    if (input.hybrid.alpha !== undefined) params.push(`alpha: ${input.hybrid.alpha}`);
    if (input.hybrid.vector) params.push(`vector: [${input.hybrid.vector.join(', ')}]`);
    if (input.hybrid.properties)
      params.push(`properties: ${JSON.stringify(input.hybrid.properties)}`);
    if (input.hybrid.fusionType) params.push(`fusionType: ${input.hybrid.fusionType}`);
    return `hybrid: { ${params.join(', ')} }`;
  }
  if (input.bm25) {
    let params: string[] = [`query: ${JSON.stringify(input.bm25.query)}`];
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
      api: z
        .enum(['graphql', 'rest'])
        .optional()
        .describe(
          'Search API. Defaults to graphql. Use rest on clusters with GraphQL disabled; REST search is experimental and requires Weaviate 1.39 or newer (enabled by default from 1.39.7).'
        ),
      targetVector: z
        .string()
        .optional()
        .describe(
          'Named vector to search. Required for collections with multiple named vectors.'
        ),
      properties: z
        .array(z.string())
        .describe(
          'Properties to return. GraphQL accepts field selections such as "address { city }" or "author { ... on Author { name } }"; REST accepts non-reference property names.'
        ),
      nearText: z
        .object({
          concepts: z.array(z.string()).describe('Natural language concepts to search for'),
          distance: z.number().optional().describe('Maximum distance threshold'),
          certainty: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Minimum certainty threshold (0-1, cosine only)')
        })
        .optional()
        .describe('Semantic text search'),
      nearVector: z
        .object({
          vector: z.array(z.number()).describe('Query vector for similarity search'),
          distance: z.number().optional().describe('Maximum distance threshold'),
          certainty: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Minimum certainty threshold')
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
            .min(0)
            .max(1)
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
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of results to return'),
      offset: z.number().int().nonnegative().optional().describe('Number of results to skip'),
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
    let methods = ['nearText', 'nearVector', 'nearObject', 'hybrid', 'bm25'] as const;
    let selected = methods.filter(method => ctx.input[method] !== undefined);
    if (selected.length !== 1) {
      throw createApiServiceError(
        'Provide exactly one search method: nearText, nearVector, nearObject, hybrid, or bm25.'
      );
    }
    for (let near of [ctx.input.nearText, ctx.input.nearVector, ctx.input.nearObject]) {
      if (near) validateDistance(near);
    }
    if (ctx.input.api === 'rest') {
      if (includeVector)
        throw createApiServiceError(
          'REST search does not return vectors. Use get_object with includeVector=true.'
        );
      let body: Record<string, unknown> = {
        where: ctx.input.where,
        limit,
        offset,
        tenant,
        autoLimit: autocut,
        returnProperties: properties,
        targetVector: ctx.input.targetVector,
        returnMetadata:
          selected[0] === 'bm25' || selected[0] === 'hybrid' ? ['score'] : ['distance']
      };
      let method: string;
      if (ctx.input.nearText) {
        method = 'near-text';
        body.query = ctx.input.nearText.concepts;
        Object.assign(body, {
          distance: ctx.input.nearText.distance,
          certainty: ctx.input.nearText.certainty
        });
      } else if (ctx.input.nearVector) {
        method = 'near-vector';
        Object.assign(body, ctx.input.nearVector);
      } else if (ctx.input.nearObject) {
        method = 'near-object';
        body.id = ctx.input.nearObject.objectId;
        body.distance = ctx.input.nearObject.distance;
      } else if (ctx.input.hybrid) {
        method = 'hybrid';
        if (ctx.input.hybrid.vector)
          throw createApiServiceError(
            'REST hybrid search does not accept a custom vector. Use graphql or nearVector.'
          );
        body.query = ctx.input.hybrid.query;
        body.alpha = ctx.input.hybrid.alpha;
        body.queryProperties = ctx.input.hybrid.properties;
        body.fusionType =
          ctx.input.hybrid.fusionType === 'rankedFusion'
            ? 'ranked'
            : ctx.input.hybrid.fusionType === 'relativeScoreFusion'
              ? 'relativeScore'
              : undefined;
      } else {
        method = 'bm25';
        body.query = ctx.input.bm25?.query;
        body.queryProperties = ctx.input.bm25?.properties;
      }
      let result = await client.search(collectionName, method, body);
      let objects = result.results.map(
        (object: {
          id: string;
          properties: Record<string, unknown>;
          metadata?: { distance?: number; certainty?: number; score?: number };
        }) => ({
          objectId: object.id,
          properties: object.properties,
          distance: object.metadata?.distance,
          certainty: object.metadata?.certainty,
          score:
            object.metadata?.score === undefined ? undefined : String(object.metadata.score)
        })
      );
      return {
        output: { objects, totalResults: objects.length },
        message: `Found **${objects.length}** result(s) in **${collectionName}**.`
      };
    }
    validateCollectionName(collectionName);
    if (ctx.input.targetVector && includeVector) {
      throw createApiServiceError(
        'Use get_object with includeVector=true to retrieve named vector embeddings.'
      );
    }
    if (ctx.input.targetVector && selected[0] !== 'bm25')
      searchOp = searchOp.replace(
        /}$/,
        `, targetVectors: ${JSON.stringify([ctx.input.targetVector])} }`
      );

    // Build arguments list
    let args: string[] = [];
    if (searchOp) args.push(searchOp);
    if (ctx.input.where) args.push(buildWhereClause(ctx.input.where));
    if (limit !== undefined) args.push(`limit: ${limit}`);
    if (offset !== undefined) args.push(`offset: ${offset}`);
    if (autocut !== undefined) args.push(`autocut: ${autocut}`);
    if (tenant) args.push(`tenant: ${JSON.stringify(tenant)}`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

    // Build additional fields
    let additionalFields: string[] = ['id'];
    if (includeVector) additionalFields.push('vector');
    if (ctx.input.nearText || ctx.input.nearVector || ctx.input.nearObject) {
      additionalFields.push('distance');
      if (
        ctx.input.nearText?.certainty !== undefined ||
        ctx.input.nearVector?.certainty !== undefined
      )
        additionalFields.push('certainty');
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
