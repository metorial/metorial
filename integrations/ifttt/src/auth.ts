import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('IFTTT Service Key for Connect API authentication'),
      webhooksKey: z
        .string()
        .optional()
        .describe(
          'Webhooks key for the Maker Webhooks service (found at ifttt.com/maker_webhooks/settings)'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Key',
    key: 'service_key',
    inputSchema: z.object({
      serviceKey: z
        .string()
        .describe(
          'Your IFTTT Service Key, found in the API tab of the IFTTT Platform under the Service Key heading'
        ),
      webhooksKey: z
        .string()
        .optional()
        .describe(
          'Your Webhooks key for the Maker Webhooks service (found at ifttt.com/maker_webhooks/settings). Required for triggering webhooks.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.serviceKey,
          webhooksKey: ctx.input.webhooksKey
        }
      };
    },
    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://connect.ifttt.com'
      });

      let response = await http.get('/v2/me', {
        headers: {
          'IFTTT-Service-Key': ctx.output.token
        }
      });

      let data = response.data?.data;
      return {
        profile: {
          id: data?.user_login || data?.service_id,
          name: data?.user_login || data?.service_id
        }
      };
    }
  });
