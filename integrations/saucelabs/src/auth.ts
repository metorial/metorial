import { SlateAuth } from 'slates';
import { z } from 'zod';
import { dataCenterSchema, SauceLabsClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      token: z.string(),
      dataCenter: dataCenterSchema.optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Access Key',
    key: 'basic_auth',
    inputSchema: z.object({
      username: z.string().describe('Your Sauce Labs username'),
      accessKey: z.string().describe('Your Sauce Labs access key (found in User Settings)'),
      dataCenter: dataCenterSchema
        .default('us-west-1')
        .describe('The data center associated with your Sauce Labs account')
    }),
    getOutput: async ctx => ({
      output: {
        username: ctx.input.username,
        token: ctx.input.accessKey,
        dataCenter: ctx.input.dataCenter
      }
    }),
    getProfile: async (ctx: {
      output: { username: string; token: string; dataCenter?: string };
      input: { username: string; accessKey: string; dataCenter: string };
    }) => {
      let client = new SauceLabsClient({
        ...ctx.output,
        dataCenter: ctx.output.dataCenter ?? ctx.input.dataCenter ?? 'us-west-1'
      });
      let user = await client.getCurrentUser(true);
      return {
        profile: {
          id: user.id,
          email: user.email ?? undefined,
          name:
            [user.first_name, user.last_name].filter(Boolean).join(' ') || ctx.output.username
        }
      };
    }
  });
