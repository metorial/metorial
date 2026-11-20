import z from 'zod';

export let slatesOption = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
  description: z.string().optional()
});

export type SlatesOption = z.infer<typeof slatesOption>;
