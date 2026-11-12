import z from 'zod';

export let slatesTriggerRoutingMatcher = z.record(z.string(), z.any());

export let slatesGooglePubSubProduct = z.enum(['gmail', 'forms', 'meet', 'storage']);

export let slatesGooglePubSubCapability = z.strictObject({
  product: slatesGooglePubSubProduct
});

export let slatesGooglePubSubInfrastructure = z.object({
  projectId: z.string().min(1),
  topicName: z.string().min(1),
  subscriptionName: z.string().min(1),
  pushServiceAccountEmail: z.string().min(1),
  audience: z.string().min(1)
});

export let slatesTriggerGroupInfrastructure = z.object({
  googlePubSub: slatesGooglePubSubInfrastructure
});

export let slatesTriggerGroupInvocation = z.union([
  z.object({
    type: z.literal('polling'),
    intervalSeconds: z.number().min(60 * 10)
  }),
  z.object({
    type: z.literal('gateway')
  }),
  z.object({
    type: z.literal('webhook'),
    supportsExpansion: z.boolean().optional(),
    supportsRenewal: z.boolean().optional(),
    reconcileIntervalSeconds: z.number().int().min(900).optional(),
    googlePubSub: slatesGooglePubSubCapability.optional(),
    registration: z.union([
      z.object({
        mode: z.literal('auto'),
        config: z
          .object({
            userConfigSchema: z.record(z.string(), z.any()),
            fullConfigSchema: z.record(z.string(), z.any())
          })
          .optional()
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
  selectionSchema: z.record(z.string(), z.any()).optional(),

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
export type SlatesGooglePubSubProduct = z.infer<typeof slatesGooglePubSubProduct>;
export type SlatesGooglePubSubCapability = z.infer<typeof slatesGooglePubSubCapability>;
export type SlatesGooglePubSubInfrastructure = z.infer<
  typeof slatesGooglePubSubInfrastructure
>;
export type SlatesTriggerGroupInfrastructure = z.infer<
  typeof slatesTriggerGroupInfrastructure
>;
export type SlatesTriggerGroupInvocation = z.infer<typeof slatesTriggerGroupInvocation>;
export type SlatesTriggerGroup = z.infer<typeof slatesTriggerGroup>;
export type SlatesWebhookTargetOwnership = z.infer<typeof slatesWebhookTargetOwnership>;
export type SlatesWebhookTarget = z.infer<typeof slatesWebhookTarget>;
