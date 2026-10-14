import { z } from 'zod';

export let findAllSchemaOutput = z.object({
  findallId: z.string().describe('FindAll run ID'),
  objective: z.string().describe('Natural language search objective'),
  entityType: z.string().describe('Entity type being discovered'),
  matchConditions: z
    .array(
      z.object({
        name: z.string().describe('Condition identifier'),
        description: z.string().describe('Criteria the entity must satisfy')
      })
    )
    .describe('Match conditions used by the run'),
  generator: z.string().describe('FindAll generator tier'),
  matchLimit: z.number().nullable().describe('Current total match limit, when available'),
  enrichments: z
    .array(
      z.object({
        processor: z.string().describe('Task API enrichment processor'),
        outputSchema: z
          .record(z.string(), z.unknown())
          .describe('Provider JSON output-schema envelope')
      })
    )
    .describe('Enrichments configured for this run')
});
