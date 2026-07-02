import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let manageSecrets = SlateTool.create(spec, {
  name: 'Manage Pipeline Secrets',
  key: 'manage_secrets',
  description: `List, create, update, or delete pipeline secrets. Secrets are secure keys used by workflow tasks to interact with external systems (e.g., database passwords, API tokens). Secrets are available to workflows launched in the workspace.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      secretId: z.number().optional().describe('Secret ID (required for update and delete)'),
      name: z.string().optional().describe('Secret name (required for create)'),
      value: z
        .string()
        .optional()
        .describe('Secret value (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      secrets: z
        .array(
          z.object({
            secretId: z.number().optional(),
            name: z.string().optional(),
            dateCreated: z.string().optional(),
            lastUpdated: z.string().optional()
          })
        )
        .optional()
        .describe('List of secrets (for list action)'),
      secretId: z.number().optional().describe('Created or affected secret ID'),
      deleted: z.boolean().optional().describe('Whether the secret was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    if (ctx.input.action === 'list') {
      let secrets = await client.listSecrets();
      return {
        output: {
          secrets: secrets.map(s => ({
            secretId: s.id,
            name: s.name,
            dateCreated: s.dateCreated,
            lastUpdated: s.lastUpdated
          }))
        },
        message: `Found **${secrets.length}** pipeline secrets.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.value)
        throw new Error('name and value are required to create a secret');
      let secret = await client.createSecret({ name: ctx.input.name, value: ctx.input.value });
      return {
        output: { secretId: secret.id },
        message: `Secret **${ctx.input.name}** created.`
      };
    }

    if (!ctx.input.secretId) throw new Error('secretId is required for update and delete');

    if (ctx.input.action === 'delete') {
      await client.deleteSecret(ctx.input.secretId);
      return {
        output: { secretId: ctx.input.secretId, deleted: true },
        message: `Secret **${ctx.input.secretId}** deleted.`
      };
    }

    // update
    await client.updateSecret(ctx.input.secretId, {
      name: ctx.input.name,
      value: ctx.input.value
    });
    return {
      output: { secretId: ctx.input.secretId },
      message: `Secret **${ctx.input.secretId}** updated.`
    };
  })
  .build();
