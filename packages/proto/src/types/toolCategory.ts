import z from 'zod';

export let slatesToolCategory = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional()
});

export type SlatesToolCategory = z.infer<typeof slatesToolCategory>;
