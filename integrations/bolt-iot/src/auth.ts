import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      deviceName: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Bolt IoT API key. Generate one from the Bolt Cloud control panel at cloud.boltiot.com.'
        ),
      deviceName: z
        .string()
        .describe(
          'The Device ID of your Bolt module, in the format BOLTXXXXXXX. Found on the Bolt Cloud dashboard.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          deviceName: ctx.input.deviceName
        }
      };
    }
  });
