import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      widgetKey: z.string(),
      token: z.string(),
      dialerToken: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Speed To Lead API Keys',
    key: 'speed_to_lead_keys',

    inputSchema: z.object({
      widgetKey: z
        .string()
        .describe(
          'Widget Key found in Convolo Dashboard under Convolo Leads > Widgets > Settings > Main tab'
        ),
      apiKey: z
        .string()
        .describe('API Key found on the Integrations tab of the widget settings'),
      dialerApiKey: z
        .string()
        .optional()
        .describe('Power Dialer API Key (optional, required for dialer features)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          widgetKey: ctx.input.widgetKey,
          token: ctx.input.apiKey,
          dialerToken: ctx.input.dialerApiKey
        }
      };
    }
  });
