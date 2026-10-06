import { SlateAuth } from 'slates';
import { z } from 'zod';
export const auth = SlateAuth.create()
  .output(z.object({ token: z.string().min(1) }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .refine(
          value =>
            !Array.from(value).some(
              char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127
            ),
          'Use the API key without spaces or control characters.'
        )
        .describe(
          'Bearer Management API key from the imgix dashboard. Permissions determine access to sources, assets, analytics, and purge operations.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile: async () => ({
      profile: {
        name: 'imgix API key',
        description:
          'Management API permissions are configured on this key. No account identity is inferred from the credential.'
      }
    })
  });
