import z from 'zod';

export let slatesActionScopeClause = z.object({
  OR: z.array(z.string()).min(1)
});

export let slatesActionScopes = z.object({
  AND: z.array(slatesActionScopeClause).min(1)
});

export let slatesActionBase = z.object({
  id: z.string(),

  name: z.string(),
  description: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  tags: z
    .object({
      destructive: z.boolean().optional(),
      readOnly: z.boolean().optional()
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  scopes: slatesActionScopes.optional(),
  authMethods: z.array(z.string()).optional(),

  inputSchema: z.record(z.string(), z.any()),
  outputSchema: z.record(z.string(), z.any()),

  docs: z.array(
    z.object({
      type: z.literal('docs.action.general').optional(),
      name: z.string(),
      url: z.string()
    })
  )
});

export let slatesActionTool = slatesActionBase.extend({
  type: z.literal('action.tool'),
  capabilities: z.object({})
});

export let slatesWebhookRequestMatcher = z.object({
  method: z.string().optional(),
  hasQueryParam: z.string().optional(),
  hasHeader: z.string().optional(),
  jsonBodyField: z
    .object({
      path: z.string(),
      equals: z.string().optional()
    })
    .optional(),
  formBodyField: z
    .object({
      path: z.string(),
      equals: z.string().optional()
    })
    .optional()
});

export let slatesWebhookHttp = z.object({
  methods: z
    .array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']))
    .optional(),
  sync: z
    .object({
      mode: z.enum(['never', 'match', 'always']),
      match: z.array(slatesWebhookRequestMatcher).optional(),
      timeoutMs: z.number().int().positive().max(15_000).optional()
    })
    .optional()
});

export let slatesActionTrigger = slatesActionBase.extend({
  type: z.literal('action.trigger'),
  capabilities: z.object({}),

  invocation: z.union([
    z.object({
      type: z.literal('polling'),
      intervalSeconds: z.number().min(60 * 10)
    }),
    z.object({
      type: z.literal('webhook'),
      autoRegistration: z.boolean(),
      autoUnregistration: z.boolean(),
      http: slatesWebhookHttp.optional()
    })
  ])
});

export let slatesAction = z.union([slatesActionTool, slatesActionTrigger]);

export type SlatesAction = z.infer<typeof slatesAction>;
export type SlatesActionTool = z.infer<typeof slatesActionTool>;
export type SlatesActionTrigger = z.infer<typeof slatesActionTrigger>;
export type SlatesActionScopes = z.infer<typeof slatesActionScopes>;
export type SlatesWebhookRequestMatcher = z.infer<typeof slatesWebhookRequestMatcher>;
export type SlatesWebhookHttp = z.infer<typeof slatesWebhookHttp>;
