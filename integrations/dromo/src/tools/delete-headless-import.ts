import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let deleteHeadlessImport = SlateTool.create(spec, {
  name: 'Delete Headless Import',
  key: 'delete_headless_import',
  description: `Permanently deletes a headless import and all associated data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      importId: z.string().describe('ID of the headless import to delete')
    })
  )
  .output(
    z.object({
      importId: z.string().describe('ID of the deleted headless import'),
      deleted: z.boolean().describe('Whether the import was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    await client.deleteHeadlessImport(ctx.input.importId);

    return {
      output: {
        importId: ctx.input.importId,
        deleted: true
      },
      message: `Successfully deleted headless import **${ctx.input.importId}**.`
    };
  })
  .build();
