import { SlateAuth } from 'slates';
import { z } from 'zod';
import { deploymentUrlInput, parseDeploymentUrl } from './lib/deployment';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1),
      orgId: z.string().optional(),
      flowId: z.string().optional(),
      inferenceBaseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Your Stack AI API key (public key). Navigate to Settings > API Keys in your Stack AI dashboard to generate one.'
        ),
      deploymentUrl: deploymentUrlInput
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey.trim(),
          ...(ctx.input.deploymentUrl ? parseDeploymentUrl(ctx.input.deploymentUrl) : {})
        }
      };
    }
  });
