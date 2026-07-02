import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageExtension = SlateTool.create(spec, {
  name: 'Manage Extensions',
  key: 'manage_extension',
  description: `List, retrieve, or delete Chrome extensions configured on your account. Extensions can be loaded into browser sessions for ad blocking, privacy tools, or custom functionality.`,
  instructions: [
    'Uploading extensions is not supported via this tool (requires file upload).',
    'To use an extension in a session, pass its ID in the extensionIds field when creating a session.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'delete']).describe('Operation to perform'),
      extensionId: z.string().optional().describe('Extension ID (required for get and delete)')
    })
  )
  .output(
    z.object({
      extensions: z
        .array(
          z.object({
            extensionId: z.string(),
            name: z.string(),
            manifest: z.record(z.string(), z.unknown()).optional(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .optional(),
      extension: z
        .object({
          extensionId: z.string(),
          name: z.string(),
          manifest: z.record(z.string(), z.unknown()).optional(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let items = await client.listExtensions();
      return {
        output: {
          extensions: (items ?? []).map(e => ({
            extensionId: e.id,
            name: e.name,
            manifest: e.manifest,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt
          }))
        },
        message: `Found **${(items ?? []).length}** extensions.`
      };
    }

    if (input.action === 'get') {
      if (!input.extensionId) throw new Error('extensionId is required for get.');
      let e = await client.getExtension(input.extensionId);
      return {
        output: {
          extension: {
            extensionId: e.id,
            name: e.name,
            manifest: e.manifest,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt
          }
        },
        message: `Extension **${e.name}** (${e.id}) retrieved.`
      };
    }

    if (input.action === 'delete') {
      if (!input.extensionId) throw new Error('extensionId is required for delete.');
      await client.deleteExtension(input.extensionId);
      return {
        output: { deleted: true },
        message: `Extension **${input.extensionId}** has been deleted.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
