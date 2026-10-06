import { SlateAuth } from 'slates';
import { z } from 'zod';
import { ConnectClient } from './lib/client';
import { credential, webhookKey } from './lib/contracts';

const authOutput = z.object({
  token: z.string().describe('Platform Service Key; empty for a Webhooks-only connection'),
  webhooksKey: z.string().optional().describe('Maker Webhooks key'),
  serviceId: z
    .string()
    .optional()
    .describe('Service ID observed from the authenticated Connect API')
});
export const auth = SlateAuth.create()
  .output(authOutput)
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Key',
    key: 'service_key',
    inputSchema: z.object({
      serviceKey: z.string().describe('Platform Service Key from your service API settings'),
      webhooksKey: z
        .string()
        .optional()
        .describe('Optional Maker Webhooks key; webhook execution is currently unavailable')
    }),
    getOutput: async ctx => {
      const token = credential(ctx.input.serviceKey, 'Platform Service Key');
      const key =
        ctx.input.webhooksKey === undefined ? undefined : webhookKey(ctx.input.webhooksKey);
      const info = await new ConnectClient({ token, webhooksKey: key }).getServiceInfo();
      return { output: { token, webhooksKey: key, serviceId: info.service_id } };
    },
    getProfile: async (ctx: { output: z.infer<typeof authOutput> }) => {
      const info = await new ConnectClient(ctx.output).getServiceInfo();
      return { profile: { id: info.service_id, name: info.service_id } };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Webhooks Key (execution unavailable)',
    key: 'webhooks_key',
    inputSchema: z.object({
      webhooksKey: z
        .string()
        .describe(
          'Maker Webhooks key copied from the Webhooks Documentation page; no Platform key is needed. This method currently provides no executable webhook action or authenticated identity check.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: '', webhooksKey: webhookKey(ctx.input.webhooksKey) }
    })
  });
