import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let ingestFindall = SlateTool.create(spec, {
  name: 'Ingest FindAll Query',
  key: 'ingest_findall',
  description: `Convert a natural language objective into structured FindAll parameters. Parses the objective into an entity type and match conditions that can be used with the **Find Entities** tool.
Use this to auto-generate the entityType and matchConditions from a plain-English query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objective: z
        .string()
        .describe(
          'Natural language description of entities to find (e.g. "portfolio companies of Khosla Ventures founded after 2020")'
        )
    })
  )
  .output(
    z.object({
      entityType: z
        .string()
        .describe('Detected entity type (e.g. companies, people, products)'),
      matchConditions: z
        .array(
          z.object({
            name: z.string().describe('Condition identifier name'),
            description: z.string().describe('Description of what the condition checks')
          })
        )
        .describe('Auto-generated match conditions from the objective')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.ingestFindAll(ctx.input.objective);

    return {
      output: result,
      message: `Parsed objective into entity type **${result.entityType}** with **${result.matchConditions.length}** match condition${result.matchConditions.length !== 1 ? 's' : ''}.`
    };
  })
  .build();
