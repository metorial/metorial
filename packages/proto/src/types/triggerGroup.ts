import z from 'zod';

export let slatesTriggerRoutingMatcher = z.record(z.string(), z.any());

export let slatesTriggerGroupInvocation = z.union([
  z.object({
    type: z.literal('polling'),
    intervalSeconds: z.number().min(60 * 10)
  }),
  z.object({
    type: z.literal('webhook'),
    registration: z.union([
      z.object({
        mode: z.literal('auto')
      }),
      z.object({
        mode: z.literal('manual'),
        userConfigSchema: z.record(z.string(), z.any()),
        fullConfigSchema: z.record(z.string(), z.any())
      })
    ])
  })
]);

export let slatesTriggerGroup = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),

  invocation: slatesTriggerGroupInvocation
});

export let slatesWebhookTargetOwnership = z.enum(['single_user', 'multi_user']);

export let slatesWebhookTarget = z.object({
  webhookTargetIdentifier: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()),
  webhookTargetPayload: z.any(),
  targetOwnership: slatesWebhookTargetOwnership
});

export type SlatesTriggerRoutingMatcher = z.infer<typeof slatesTriggerRoutingMatcher>;
export type SlatesTriggerGroupInvocation = z.infer<typeof slatesTriggerGroupInvocation>;
export type SlatesTriggerGroup = z.infer<typeof slatesTriggerGroup>;
export type SlatesWebhookTargetOwnership = z.infer<typeof slatesWebhookTargetOwnership>;
export type SlatesWebhookTarget = z.infer<typeof slatesWebhookTarget>;
