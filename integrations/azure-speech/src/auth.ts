import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Azure Speech subscription key used for API authentication')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Subscription Key',
    key: 'subscription_key',

    inputSchema: z.object({
      subscriptionKey: z
        .string()
        .describe(
          'Azure Speech resource subscription key (KEY1 or KEY2 from the Azure portal)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.subscriptionKey
        }
      };
    }
  });
