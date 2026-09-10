import { SlateAuth } from 'slates';
import { z } from 'zod';

export let testAuthOutputSchema = z.object({
  token: z.string(),
  accountId: z.string()
});

export type TestAuth = z.infer<typeof testAuthOutputSchema>;

export let auth = SlateAuth.create<TestAuth>()
  .output(testAuthOutputSchema)
  .addTokenAuth({
    type: 'auth.token',
    key: 'token',
    name: 'Token',
    inputSchema: z.object({
      token: z.string().describe('API token'),
      accountId: z.string().describe('Account ID used to route trigger events')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        accountId: ctx.input.accountId
      }
    }),
    getProfile: async (ctx: { output: TestAuth }) => ({
      profile: {
        id: ctx.output.accountId,
        name: `Account ${ctx.output.accountId}`
      }
    })
  });
