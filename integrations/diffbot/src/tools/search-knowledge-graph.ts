import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

let entitySchema = z
  .object({
    diffbotUri: z.string().optional().describe('Unique Diffbot URI for the entity'),
    type: z.string().optional().describe('Entity type (Organization, Person, Article, etc.)'),
    name: z.string().optional().describe('Name of the entity'),
    summary: z.string().optional().describe('Brief description or summary'),
    nbOrigins: z.number().optional().describe('Number of web sources'),
    nbIncomingEdges: z.number().optional().describe('Number of incoming graph connections'),
    types: z.array(z.string()).optional().describe('List of entity types'),
    origin: z.string().optional().describe('Origin URL')
  })
  .passthrough();

export let searchKnowledgeGraph = SlateTool.create(spec, {
  name: 'Search Knowledge Graph',
  key: 'search_knowledge_graph',
  description: `Search Diffbot's Knowledge Graph containing over 10 billion entities (organizations, people, articles, products, etc.) using DQL (Diffbot Query Language). Returns structured records with comprehensive fields and properties.`,
  instructions: [
    'Use DQL syntax for queries, e.g., `type:Organization name:"Apple"` or `type:Person employments.employer.name:"Google"`.',
    'Filter by entity type using the `type` field in the query: Organization, Person, Article, Product, etc.',
    'Use `size` to control how many results are returned (default varies by plan).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'DQL (Diffbot Query Language) query string, e.g., type:Organization name:"Apple Inc"'
        ),
      size: z.number().optional().describe('Maximum number of results to return'),
      from: z.number().optional().describe('Offset for pagination (skip this many results)'),
      filter: z
        .string()
        .optional()
        .describe('Additional filter expression to apply to results')
    })
  )
  .output(
    z.object({
      totalHits: z.number().describe('Total number of matching entities'),
      hits: z.number().describe('Number of entities returned in this response'),
      entities: z.array(entitySchema).describe('Array of matching entities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiffbotClient({ token: ctx.auth.token });

    let result = await client.searchKnowledgeGraph({
      query: ctx.input.query,
      size: ctx.input.size,
      from: ctx.input.from,
      filter: ctx.input.filter
    });

    let entities = result.data || [];
    let totalHits = result.hits || 0;

    return {
      output: {
        totalHits,
        hits: entities.length,
        entities
      },
      message: `Found **${totalHits}** total matching entities, returned **${entities.length}** results for query: \`${ctx.input.query}\`.`
    };
  })
  .build();
