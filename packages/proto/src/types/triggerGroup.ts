import z from 'zod';

export let slatesTriggerRoutingMatcher = z.record(z.string(), z.any());

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
    registration: z.union([
      z.object({
        mode: z.literal('auto'),
        deliveryConfig: z
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

// Set on a top-level selection schema property whose values can be listed for a connected
// account. On an array property the listed options are values for its items.
export let slatesSelectionOptionsSchemaKey = 'x-slates-options';

// Set on a selection schema property whose values can also be listed by an option list another
// integration exports, run with that integration's connection for the same account.
export let slatesSelectionOptionsLinkedSchemaKey = 'x-slates-options-linked';

export let slatesLinkedOptionList = z.object({
  slate: z.string(),
  optionList: z.string(),
  params: z.record(z.string(), z.any()).optional()
});

export type SlatesLinkedOptionList = z.infer<typeof slatesLinkedOptionList>;
export type SlatesTriggerRoutingMatcher = z.infer<typeof slatesTriggerRoutingMatcher>;
export type SlatesTriggerGroupInvocation = z.infer<typeof slatesTriggerGroupInvocation>;
export type SlatesTriggerGroup = z.infer<typeof slatesTriggerGroup>;
export type SlatesWebhookTargetOwnership = z.infer<typeof slatesWebhookTargetOwnership>;
export type SlatesWebhookTarget = z.infer<typeof slatesWebhookTarget>;
