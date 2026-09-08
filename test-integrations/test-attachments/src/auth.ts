import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Attachment Server Token',
    key: 'attachment_server_token',
    inputSchema: z.object({
      token: z.string().describe('Must match ATTACHMENT_TEST_TOKEN on the test helper.')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token
      }
    })
  });
