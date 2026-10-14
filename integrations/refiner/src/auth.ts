import { SlateAuth } from 'slates';
import { z } from 'zod';
import { RefinerClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Refiner API key. Found in the Refiner dashboard under Environment Settings > API Keys.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let project = await new RefinerClient({ token: ctx.output.token }).getCurrentProject();

      return {
        profile: {
          name: project.project_name
        }
      };
    }
  });
