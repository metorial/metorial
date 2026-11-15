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
  ),

  adapter: z.optional(z.nullable(z.string()))
});

export let slatesActionTool = slatesActionBase.extend({
  type: z.literal('action.tool'),
  capabilities: z.object({}),
  isPublic: z.boolean(),
  toolCategoryIds: z.array(z.string()).optional()
});

export let slatesActionTrigger = slatesActionBase.extend({
  type: z.literal('action.trigger'),
  capabilities: z.object({}),

  triggerGroupId: z.string()
});

export let slatesAction = z.union([slatesActionTool, slatesActionTrigger]);

// Set on a top-level property of a trigger's output schema whose values are returned as event
// attributes with every mapped event, so events can be filtered by them.
export let slatesEventAttributeSchemaKey = 'x-slates-event-attribute';

export let slatesEventAttributeMaxKeys = 8;
export let slatesEventAttributeMaxValues = 16;
export let slatesEventAttributeMaxValueLength = 256;
export let slatesEventAttributeKeyPattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

export let slatesEventAttributes = z
  .record(
    z.string().regex(slatesEventAttributeKeyPattern),
    z
      .array(z.string().min(1).max(slatesEventAttributeMaxValueLength))
      .min(1)
      .max(slatesEventAttributeMaxValues)
  )
  .refine(attributes => Object.keys(attributes).length <= slatesEventAttributeMaxKeys);

export type SlatesAction = z.infer<typeof slatesAction>;
export type SlatesActionTool = z.infer<typeof slatesActionTool>;
export type SlatesActionTrigger = z.infer<typeof slatesActionTrigger>;
export type SlatesActionScopes = z.infer<typeof slatesActionScopes>;
export type SlatesEventAttributes = z.infer<typeof slatesEventAttributes>;
