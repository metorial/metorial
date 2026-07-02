import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMetadata = SlateTool.create(spec, {
  name: 'Manage File Metadata',
  key: 'manage_metadata',
  description: `Read, set, or delete arbitrary key-value metadata on a file. Useful for tagging, categorization, and custom data storage. Use action "get" to read all metadata, "set" to update a key, or "delete" to remove a key.`
})
  .input(
    z.object({
      fileId: z.string().describe('UUID of the file'),
      action: z.enum(['get', 'set', 'delete']).describe('Action to perform on metadata'),
      key: z
        .string()
        .optional()
        .describe('Metadata key (required for set and delete actions)'),
      value: z.string().optional().describe('Metadata value (required for set action)')
    })
  )
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('All metadata key-value pairs (for get action)'),
      updatedValue: z.string().optional().describe('The updated value (for set action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the key was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'get') {
      let metadata = await client.getMetadata(ctx.input.fileId);
      let keyCount = Object.keys(metadata).length;
      return {
        output: { metadata },
        message: `Retrieved **${keyCount}** metadata key(s) for file ${ctx.input.fileId}.`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.key) throw new Error('key is required for set action');
      if (ctx.input.value === undefined) throw new Error('value is required for set action');
      let updatedValue = await client.updateMetadataKey(
        ctx.input.fileId,
        ctx.input.key,
        ctx.input.value
      );
      return {
        output: { updatedValue },
        message: `Set metadata key **${ctx.input.key}** = "${updatedValue}" on file ${ctx.input.fileId}.`
      };
    }

    if (!ctx.input.key) throw new Error('key is required for delete action');
    await client.deleteMetadataKey(ctx.input.fileId, ctx.input.key);
    return {
      output: { deleted: true },
      message: `Deleted metadata key **${ctx.input.key}** from file ${ctx.input.fileId}.`
    };
  })
  .build();
