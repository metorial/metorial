import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      publicKey: z.string(),
      secretKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      publicKey: z.string().describe('Uploadcare Public Key from your project settings'),
      secretKey: z.string().describe('Uploadcare Secret Key from your project settings')
    }),

    getOutput: async ctx => {
      if (!ctx.input.publicKey.trim() || !ctx.input.secretKey.trim()) {
        throw createApiServiceError(
          'Both the Uploadcare public and secret keys are required.'
        );
      }
      return {
        output: {
          publicKey: ctx.input.publicKey,
          secretKey: ctx.input.secretKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { publicKey: string; secretKey: string };
      input: { publicKey: string; secretKey: string };
    }) => {
      let project = await new Client(ctx.output).getProject();

      return {
        profile: {
          id: ctx.output.publicKey,
          name: project.name ?? project.pub_key ?? ctx.output.publicKey
        }
      };
    }
  });
