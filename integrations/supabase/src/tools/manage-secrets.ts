import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageSecrets = SlateTool.create(spec, {
  name: 'Manage Secrets',
  key: 'manage_secrets',
  description: `List, create, or delete secrets (environment variables) for a Supabase project. Secrets are typically used by Edge Functions and other server-side code.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      secrets: z
        .array(
          z.object({
            name: z.string().describe('Secret name'),
            value: z.string().optional().describe('Secret value (required for create)')
          })
        )
        .optional()
        .describe('Secrets to create or names to delete')
    })
  )
  .output(
    z.object({
      secrets: z
        .array(
          z.object({
            name: z.string().describe('Secret name')
          })
        )
        .optional()
        .describe('List of secret names'),
      created: z.boolean().optional().describe('Whether secrets were created'),
      deleted: z.boolean().optional().describe('Whether secrets were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = ctx.input.projectRef ?? ctx.config.projectRef;
    if (!projectRef) {
      throw new Error(
        'projectRef is required — provide it as input or set it in the configuration'
      );
    }

    let client = new ManagementClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let data = await client.listSecrets(projectRef);
      let secrets = (Array.isArray(data) ? data : []).map((s: any) => ({
        name: s.name ?? ''
      }));

      return {
        output: { secrets },
        message: `Found **${secrets.length}** secrets in project **${projectRef}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.secrets || ctx.input.secrets.length === 0) {
        throw new Error('secrets array is required for create action');
      }
      let secretsToCreate = ctx.input.secrets.map(s => ({
        name: s.name,
        value: s.value ?? ''
      }));
      await client.createSecrets(projectRef, secretsToCreate);
      return {
        output: { created: true },
        message: `Created **${secretsToCreate.length}** secrets in project **${projectRef}**.`
      };
    }

    // delete
    if (!ctx.input.secrets || ctx.input.secrets.length === 0) {
      throw new Error('secrets array with names is required for delete action');
    }
    let names = ctx.input.secrets.map(s => s.name);
    await client.deleteSecrets(projectRef, names);
    return {
      output: { deleted: true },
      message: `Deleted **${names.length}** secrets from project **${projectRef}**.`
    };
  })
  .build();
