import { SlateAuth } from 'slates';
import { z } from 'zod';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    key: 'api_key',
    name: 'API Key',
    inputSchema: z.object({ apiKey: z.string().min(1).describe('Context.dev API key.') }),
    getOutput: async ctx => ({ output: { token: ctx.input.apiKey } })
  });
