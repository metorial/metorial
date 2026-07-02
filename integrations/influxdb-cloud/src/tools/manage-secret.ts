import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSecrets = SlateTool.create(spec, {
  name: 'List Secret Keys',
  key: 'list_secrets',
  description: `List all secret keys stored for the organization. Only the keys are returned, not the values.
Secrets are stored securely using Vault and can be referenced in Flux scripts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      secretKeys: z.array(z.string()).describe('List of secret key names')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listSecretKeys();

    return {
      output: { secretKeys: result.secrets || [] },
      message: `Found **${(result.secrets || []).length}** secret key(s).`
    };
  })
  .build();

export let upsertSecrets = SlateTool.create(spec, {
  name: 'Upsert Secrets',
  key: 'upsert_secrets',
  description: `Add or update one or more secrets for the organization. Provide key-value pairs where each key is the secret name and each value is the secret content.
Secrets can be referenced in Flux scripts using \`secrets.get()\`.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      secrets: z
        .record(z.string(), z.string())
        .describe('Key-value pairs of secret names and their values')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the secrets were stored successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.putSecrets(ctx.input.secrets);

    let keys = Object.keys(ctx.input.secrets);

    return {
      output: { success: true },
      message: `Successfully stored **${keys.length}** secret(s): ${keys.join(', ')}.`
    };
  })
  .build();

export let deleteSecrets = SlateTool.create(spec, {
  name: 'Delete Secrets',
  key: 'delete_secrets',
  description: `Delete one or more secrets from the organization by their keys.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      secretKeys: z.array(z.string()).describe('List of secret key names to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the secrets were deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteSecrets(ctx.input.secretKeys);

    return {
      output: { success: true },
      message: `Deleted **${ctx.input.secretKeys.length}** secret(s): ${ctx.input.secretKeys.join(', ')}.`
    };
  })
  .build();
