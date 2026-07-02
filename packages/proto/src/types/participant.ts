import z from 'zod';

export let slatesParticipant = z.object({
  type: z.union([z.literal('consumer'), z.literal('hub')]),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type SlatesParticipant = z.infer<typeof slatesParticipant>;
