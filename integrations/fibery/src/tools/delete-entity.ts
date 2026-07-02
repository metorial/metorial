import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEntityTool = SlateTool.create(spec, {
  name: 'Delete Entity',
  key: 'delete_entity',
  description: `Permanently delete an entity (record) from a Type (database) in the Fibery workspace. This action is irreversible.`,
  instructions: [
    'Use "query_entities" to find the entity ID before deleting.',
    'This permanently removes the entity and cannot be undone.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      typeName: z
        .string()
        .describe('Fully qualified type name (e.g., "Project Management/Task")'),
      entityId: z.string().describe('The fibery/id of the entity to delete')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('The fibery/id of the deleted entity'),
      deleted: z.boolean().describe('Whether the entity was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    await client.deleteEntity(ctx.input.typeName, ctx.input.entityId);

    return {
      output: {
        entityId: ctx.input.entityId,
        deleted: true
      },
      message: `Deleted entity \`${ctx.input.entityId}\` from **${ctx.input.typeName}**.`
    };
  })
  .build();
