import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let secretSchema = z.object({
  secretName: z.string().describe('Name of the secret'),
  type: z.string().describe('Type of the secret binding')
});

export let listSecrets = SlateTool.create(spec, {
  name: 'List Secrets',
  key: 'list_secrets',
  description: `List all secret bindings on a Worker script. Returns secret names and types only — secret values are never exposed after creation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script')
    })
  )
  .output(
    z.object({
      secrets: z.array(secretSchema).describe('List of secrets (values are never returned)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let secrets = await client.listSecrets(ctx.input.scriptName);

    let mapped = (secrets || []).map((s: any) => ({
      secretName: s.name,
      type: s.type
    }));

    return {
      output: { secrets: mapped },
      message: `Found **${mapped.length}** secret(s) on Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let getSecret = SlateTool.create(spec, {
  name: 'Get Secret Metadata',
  key: 'get_secret',
  description: `Retrieve metadata for a secret binding on a Worker script. Secret values are not exposed in tool output.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      secretName: z.string().describe('Name of the secret binding')
    })
  )
  .output(secretSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getSecret(ctx.input.scriptName, ctx.input.secretName);

    return {
      output: {
        secretName: result.name || ctx.input.secretName,
        type: result.type || 'secret_text'
      },
      message: `Retrieved metadata for secret **${ctx.input.secretName}** on Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let putSecret = SlateTool.create(spec, {
  name: 'Set Secret',
  key: 'put_secret',
  description: `Create or update a secret on a Worker script. The secret value will be encrypted and stored securely. Once set, the value cannot be retrieved — only overwritten or deleted.`
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      secretName: z.string().describe('Name for the secret binding'),
      secretValue: z.string().describe('Secret value to encrypt and store')
    })
  )
  .output(
    z.object({
      secretName: z.string().describe('Name of the created/updated secret'),
      type: z.string().describe('Type of the secret binding')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.putSecret(
      ctx.input.scriptName,
      ctx.input.secretName,
      ctx.input.secretValue
    );

    return {
      output: {
        secretName: result.name,
        type: result.type
      },
      message: `Secret **${ctx.input.secretName}** has been set on Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let deleteSecret = SlateTool.create(spec, {
  name: 'Delete Secret',
  key: 'delete_secret',
  description: `Delete a secret binding from a Worker script. This permanently removes the encrypted value.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      secretName: z.string().describe('Name of the secret to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteSecret(ctx.input.scriptName, ctx.input.secretName);

    return {
      output: { deleted: true },
      message: `Secret **${ctx.input.secretName}** has been deleted from Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
