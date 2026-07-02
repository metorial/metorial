import z from 'zod';

export let slatesAuthenticationMethod = z.object({
  id: z.string(),
  name: z.string(),

  type: z.union([
    z.literal('auth.oauth'),
    z.literal('auth.token'),
    z.literal('auth.service_account'),
    z.literal('auth.custom')
  ]),

  scopes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        defaultChecked: z.boolean().optional()
      })
    )
    .optional(),

  inputSchema: z.record(z.string(), z.any()),
  outputSchema: z.record(z.string(), z.any()),

  capabilities: z.object({
    getDefaultInput: z.object({ enabled: z.boolean() }).optional(),
    handleChangedInput: z.object({ enabled: z.boolean() }).optional(),
    handleTokenRefresh: z.object({ enabled: z.boolean() }).optional(),
    getProfile: z.object({ enabled: z.boolean() }).optional()
  }),

  docs: z.array(
    z.object({
      type: z
        .union([
          z.literal('docs.auth.oauth'),
          z.literal('docs.auth.oauth_scopes'),
          z.literal('docs.auth.token'),
          z.literal('docs.auth.service_account'),
          z.literal('docs.auth.custom')
        ])
        .optional(),
      name: z.string(),
      url: z.string()
    })
  )
});

export type SlateAuthenticationMethod = z.infer<typeof slatesAuthenticationMethod>;
