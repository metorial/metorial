import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      applicationKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'API Key from your AmbientWeather.net account page. Grants access to your device data.'
        ),
      applicationKey: z
        .string()
        .describe(
          'Application Key from your AmbientWeather.net account page. Identifies your application.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          applicationKey: ctx.input.applicationKey
        }
      };
    }
  });
