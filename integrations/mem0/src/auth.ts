import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      orgId: z.string().optional(),
      projectId: z.string().optional(),
      userEmail: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .trim()
        .min(1)
        .describe('Mem0 API key from the Mem0 Dashboard (app.mem0.ai)')
    }),

    getOutput: async (ctx: { input: { token: string } }) => {
      let identity = await new Client({ token: ctx.input.token }).getCurrentUser();
      return {
        output: {
          token: ctx.input.token,
          orgId: identity.orgId,
          projectId: identity.projectId,
          userEmail: identity.userEmail
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let identity = await new Client({ token: ctx.output.token }).getCurrentUser();

      return {
        profile: {
          id:
            [identity.userEmail, identity.orgId, identity.projectId]
              .filter(Boolean)
              .join(':') || 'mem0',
          name: identity.userEmail || 'Mem0 API key'
        }
      };
    }
  });
