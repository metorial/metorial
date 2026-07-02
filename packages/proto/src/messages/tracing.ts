import z from 'zod';

export let slatesRequestTraceTextBody = z.object({
  contentType: z.string().optional(),
  text: z.string(),
  truncated: z.boolean().optional()
});

export let slatesRequestTrace = z.object({
  startedAt: z.string(),
  durationMs: z.number().nonnegative(),
  request: z.object({
    method: z.string(),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    body: slatesRequestTraceTextBody.optional()
  }),
  response: z
    .object({
      status: z.number(),
      statusText: z.string().optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: slatesRequestTraceTextBody.optional()
    })
    .optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string()
    })
    .optional()
});

export let withRequestTraces = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.object({
    ...shape,
    requestTraces: z.array(slatesRequestTrace).optional()
  });
