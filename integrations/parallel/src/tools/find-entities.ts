import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findEntities = SlateTool.create(spec, {
  name: 'Find Entities',
  key: 'find_entities',
  description: `Discover entities (companies, people, products, etc.) matching specific criteria from web data. Uses Parallel's FindAll API to generate candidates, validate them against your conditions, and return matches.
This is an asynchronous operation — returns a run ID. Use the **Get FindAll Results** tool to poll status and retrieve matched entities.`,
  instructions: [
    'Provide a clear objective describing what entities to find.',
    'Specify matchConditions to define criteria each entity must satisfy.',
    'Use the ingest endpoint first (via ingestObjective) to auto-generate entity type and conditions from a natural language query.',
    'Higher generator tiers (core, pro) provide more comprehensive searches for specific queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objective: z.string().describe('Natural language description of entities to find'),
      entityType: z
        .string()
        .describe('Type of entity to discover (e.g. companies, people, products)'),
      matchConditions: z
        .array(
          z.object({
            name: z.string().describe('Condition identifier name'),
            description: z.string().describe('Description of what the condition checks')
          })
        )
        .describe('Conditions each entity must satisfy to be considered a match'),
      generator: z
        .enum(['preview', 'base', 'core', 'pro'])
        .describe(
          'Search tier: preview (cheapest), base (cost-effective), core (balanced), pro (most comprehensive)'
        ),
      matchLimit: z.number().describe('Maximum number of matched entities to return'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to attach to the run'),
      excludeList: z
        .array(
          z.object({
            name: z.string().describe('Entity name to exclude'),
            url: z.string().describe('Entity URL to exclude')
          })
        )
        .optional()
        .describe('Entities to skip')
    })
  )
  .output(
    z.object({
      findallId: z
        .string()
        .describe(
          'FindAll run ID — use with Get FindAll Results to check status and retrieve matches'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.createFindAllRun({
      objective: ctx.input.objective,
      entityType: ctx.input.entityType,
      matchConditions: ctx.input.matchConditions,
      generator: ctx.input.generator,
      matchLimit: ctx.input.matchLimit,
      metadata: ctx.input.metadata,
      excludeList: ctx.input.excludeList
    });

    return {
      output: result,
      message: `FindAll run created with ID **${result.findallId}**. Use "Get FindAll Results" to check progress and retrieve matched entities.`
    };
  })
  .build();
