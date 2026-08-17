import z from 'zod';

export let slatesAdapter = z.object({
  id: z.string(),
  name: z.string(),

  capabilities: z.array(
    z.object({
      id: z.string(),
      value: z.any()
    })
  )
});

export type SlateAdapter = z.infer<typeof slatesAdapter>;
