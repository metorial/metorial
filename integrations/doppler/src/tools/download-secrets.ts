import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

export let downloadSecrets = SlateTool.create(spec, {
  name: 'Download Secrets',
  key: 'download_secrets',
  description: `Download all computed secret values from a Doppler project config as a flat key-value map. Optionally include dynamic secrets with configurable TTL. Useful for exporting secrets for local development, CI/CD pipelines, or deployment scripts.`,
  instructions: [
    'Provide the project and config to download secrets from.',
    'Optionally filter to specific secret names.',
    'Enable includeDynamicSecrets to also issue dynamic secret leases.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      project: z.string().describe('Project slug or name'),
      config: z.string().describe('Config name (e.g., "dev", "stg", "prd")'),
      secretNames: z
        .array(z.string())
        .optional()
        .describe('Specific secret names to include (omit for all)'),
      includeDynamicSecrets: z
        .boolean()
        .optional()
        .describe('Include dynamic secrets (defaults to false)'),
      dynamicSecretsTtlSec: z
        .number()
        .optional()
        .describe('TTL in seconds for dynamic secret leases (defaults to 1800)')
    })
  )
  .output(
    z.object({
      secrets: z
        .record(z.string(), z.string())
        .describe('Key-value pairs of secret names and their computed values'),
      secretCount: z.number().describe('Number of secrets downloaded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let result = await client.downloadSecrets(ctx.input.project, ctx.input.config, 'json', {
      includeDynamicSecrets: ctx.input.includeDynamicSecrets,
      dynamicSecretsTtlSec: ctx.input.dynamicSecretsTtlSec,
      secrets: ctx.input.secretNames
    });

    let secrets: Record<string, string> = {};
    if (typeof result === 'object' && result !== null) {
      for (let [key, value] of Object.entries(result)) {
        secrets[key] = String(value);
      }
    }

    let count = Object.keys(secrets).length;

    return {
      output: {
        secrets,
        secretCount: count
      },
      message: `Downloaded **${count}** secrets from **${ctx.input.project}/${ctx.input.config}**.`
    };
  })
  .build();
