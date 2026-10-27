import z from 'zod';
import { slatesRequestTrace } from '../messages/tracing';

export let slatesErrorResponse = z.looseObject({
  code: z.string(),
  kind: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
  status: z.number().optional(),

  issues: z
    .array(
      z.looseObject({
        path: z.array(z.string()).optional(),
        code: z.string().optional(),
        message: z.string()
      })
    )
    .optional(),

  provider: z
    .looseObject({
      key: z.string().optional(),
      service: z.string().optional(),
      operation: z.string().optional()
    })
    .optional(),

  upstream: z
    .looseObject({
      status: z.number().optional(),
      code: z.string().optional(),
      type: z.string().optional(),
      requestId: z.string().optional(),
      method: z.string().optional(),
      url: z.string().optional()
    })
    .optional(),

  // The upstream API's own error code, next to the normalized protocol `code`.
  upstreamCode: z.string().optional(),

  baggage: z.record(z.string(), z.unknown()).optional(),
  requestTraces: z.array(slatesRequestTrace).optional()
});

export type SlatesErrorResponse = z.infer<typeof slatesErrorResponse>;
