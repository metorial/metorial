import { SlateTool } from 'slates';
import { z } from 'zod';
import { flyIoServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageSecrets = SlateTool.create(spec, {
  name: 'Manage Secrets',
  key: 'manage_secrets',
  description: `List, set, or delete app-level secrets. Secrets are encrypted at rest and exposed as environment variables to Machines at boot time. Setting secrets does not immediately affect running Machines; they pick up changes on next launch.`,
  instructions: [
    'Use "list" to see secret names and digests (values are never exposed).',
    'Use "get" to retrieve metadata for one secret by name.',
    'Use "set" to create or update one or more secrets at once.',
    'Use "delete" to remove a specific secret by name.'
  ],
  constraints: [
    'Secret values cannot be read back — only names and digests are shown.',
    'Existing running Machines must be restarted to pick up newly set secrets.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      action: z.enum(['list', 'get', 'set', 'delete']).describe('Action to perform'),
      secrets: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of secrets to set (for "set" action)'),
      secretName: z
        .string()
        .optional()
        .describe('Name of the secret to get or delete (for "get" and "delete" actions)')
    })
  )
  .output(
    z.object({
      secrets: z
        .array(
          z.object({
            secretName: z.string().describe('Secret name'),
            digest: z.string().describe('Secret digest (hash)'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of secrets (for list action)'),
      secret: z
        .object({
          secretName: z.string().describe('Secret name'),
          digest: z.string().describe('Secret digest (hash)'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
        .optional()
        .describe('Secret metadata (for get action)'),
      set: z.boolean().optional().describe('Whether secrets were set successfully'),
      deleted: z.boolean().optional().describe('Whether the secret was deleted'),
      version: z.number().optional().describe('App secrets version after mutation')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { appName, action } = ctx.input;

    switch (action) {
      case 'list': {
        let secrets = await client.listSecrets(appName);
        return {
          output: { secrets },
          message: `Found **${secrets.length}** secret(s) in app **${appName}**.`
        };
      }
      case 'get': {
        if (!ctx.input.secretName) {
          throw flyIoServiceError('secretName is required for the get action');
        }
        let secret = await client.getSecret(appName, ctx.input.secretName);
        return {
          output: { secret },
          message: `Secret **${secret.secretName}** exists in app **${appName}**.`
        };
      }
      case 'set': {
        if (!ctx.input.secrets || Object.keys(ctx.input.secrets).length === 0) {
          throw flyIoServiceError(
            'At least one secret key-value pair is required for the set action'
          );
        }
        let result = await client.setSecrets(appName, ctx.input.secrets);
        let names = Object.keys(ctx.input.secrets);
        return {
          output: { set: true, secrets: result.secrets, version: result.version },
          message: `Set **${names.length}** secret(s): ${names.map(n => `**${n}**`).join(', ')}.`
        };
      }
      case 'delete': {
        if (!ctx.input.secretName) {
          throw flyIoServiceError('secretName is required for the delete action');
        }
        let result = await client.deleteSecret(appName, ctx.input.secretName);
        return {
          output: { deleted: true, version: result.version },
          message: `Deleted secret **${ctx.input.secretName}** from app **${appName}**.`
        };
      }
    }
  })
  .build();
