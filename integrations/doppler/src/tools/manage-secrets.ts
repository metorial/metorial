import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

let secretEntrySchema = z.object({
  raw: z.string().optional().describe('Raw secret value'),
  computed: z
    .string()
    .optional()
    .describe('Computed secret value (after variable substitution)'),
  note: z.string().optional().describe('Note attached to the secret'),
  rawVisibility: z.string().optional().describe('Visibility of the raw value'),
  computedVisibility: z.string().optional().describe('Visibility of the computed value')
});

export let manageSecrets = SlateTool.create(spec, {
  name: 'Manage Secrets',
  key: 'manage_secrets',
  description: `Retrieve, set, update, or delete secrets within a Doppler project config. Use this to read one or more secret values, bulk-set secrets as key-value pairs, or remove individual secrets.
Secrets are environment variables stored in a specific config within a project.`,
  instructions: [
    'To read all secrets, provide the project and config with action "list".',
    'To read specific secrets, use action "list" and provide secretNames.',
    'To set or update secrets, use action "set" and provide the secrets object with key-value pairs.',
    'To delete a secret, use action "delete" and provide the secretName.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      project: z.string().describe('Project slug or name'),
      config: z.string().describe('Config name (e.g., "dev", "stg", "prd")'),
      action: z
        .enum(['list', 'get', 'set', 'delete'])
        .describe('Action to perform on secrets'),
      secretName: z
        .string()
        .optional()
        .describe('Name of a specific secret (for "get" or "delete" actions)'),
      secretNames: z
        .array(z.string())
        .optional()
        .describe('List of specific secret names to retrieve (for "list" action)'),
      secrets: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of secrets to set (for "set" action)'),
      includeDynamicSecrets: z
        .boolean()
        .optional()
        .describe('Whether to include dynamic secrets in the response'),
      dynamicSecretsTtlSec: z
        .number()
        .optional()
        .describe('TTL in seconds for dynamic secret leases')
    })
  )
  .output(
    z.object({
      secrets: z
        .record(z.string(), secretEntrySchema)
        .optional()
        .describe('Map of secret names to their values'),
      secret: z
        .object({
          name: z.string().optional(),
          raw: z.string().optional(),
          computed: z.string().optional(),
          note: z.string().optional()
        })
        .optional()
        .describe('Single secret details (for "get" action)'),
      secretCount: z.number().optional().describe('Number of secrets returned or modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let secrets = await client.listSecrets(ctx.input.project, ctx.input.config, {
        includeDynamicSecrets: ctx.input.includeDynamicSecrets,
        dynamicSecretsTtlSec: ctx.input.dynamicSecretsTtlSec,
        secrets: ctx.input.secretNames
      });

      let count = Object.keys(secrets).length;

      return {
        output: {
          secrets,
          secretCount: count
        },
        message: `Retrieved **${count}** secrets from **${ctx.input.project}/${ctx.input.config}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.secretName) {
        throw new Error('secretName is required for "get" action');
      }

      let result = await client.getSecret(
        ctx.input.project,
        ctx.input.config,
        ctx.input.secretName
      );

      return {
        output: {
          secret: {
            name: result.name,
            raw: result.value?.raw,
            computed: result.value?.computed,
            note: result.value?.note
          }
        },
        message: `Retrieved secret **${ctx.input.secretName}** from **${ctx.input.project}/${ctx.input.config}**.`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.secrets || Object.keys(ctx.input.secrets).length === 0) {
        throw new Error('secrets object is required for "set" action');
      }

      let updated = await client.setSecrets(
        ctx.input.project,
        ctx.input.config,
        ctx.input.secrets
      );
      let count = Object.keys(ctx.input.secrets).length;

      return {
        output: {
          secrets: updated,
          secretCount: count
        },
        message: `Set **${count}** secret(s) in **${ctx.input.project}/${ctx.input.config}**: ${Object.keys(ctx.input.secrets).join(', ')}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.secretName) {
        throw new Error('secretName is required for "delete" action');
      }

      await client.deleteSecret(ctx.input.project, ctx.input.config, ctx.input.secretName);

      return {
        output: {
          secretCount: 0
        },
        message: `Deleted secret **${ctx.input.secretName}** from **${ctx.input.project}/${ctx.input.config}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
