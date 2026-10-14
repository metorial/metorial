import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

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
      token: z
        .string()
        .describe(
          'NeuronWriter API key. Found under Profile > Neuron API Access. Requires a Gold plan or higher.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError(
          'Enter a NeuronWriter API key from Profile > Neuron API access.'
        );
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
