import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSchema = SlateTool.create(spec, {
  name: 'Delete Schema',
  key: 'delete_schema',
  description: `Permanently deletes an import schema. Any imports or headless imports referencing this schema will no longer be able to use it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      schemaId: z.string().describe('ID of the schema to delete')
    })
  )
  .output(
    z.object({
      schemaId: z.string().describe('ID of the deleted schema'),
      deleted: z.boolean().describe('Whether the schema was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    await client.deleteSchema(ctx.input.schemaId);

    return {
      output: {
        schemaId: ctx.input.schemaId,
        deleted: true
      },
      message: `Successfully deleted schema **${ctx.input.schemaId}**.`
    };
  })
  .build();
