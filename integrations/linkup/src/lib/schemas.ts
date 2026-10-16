import { z } from 'zod';

export let researchTaskSchema = z
  .object({
    id: z.string().describe('Research task ID used by get_research'),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    createdAt: z.string(),
    updatedAt: z.string(),
    error: z.string().nullable().optional(),
    input: z.record(z.string(), z.unknown()),
    output: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional()
      .describe('Sourced answer or custom structured data, available after completion'),
    type: z.string()
  })
  .passthrough();

export type ResearchTask = z.infer<typeof researchTaskSchema>;
