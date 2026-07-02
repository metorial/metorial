import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let deleteObject = SlateTool.create(spec, {
  name: 'Delete Object',
  key: 'delete_object',
  description: `Deletes one or more objects from a Backendless database table. Supports deleting a single object by ID or bulk-deleting all objects matching a where clause.`,
  constraints: [
    'Bulk deletion is irreversible. Ensure the where clause is correct before proceeding.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the database table'),
      objectId: z.string().optional().describe('ID of a specific object to delete'),
      where: z
        .string()
        .optional()
        .describe('Where clause for bulk deletion, e.g. "status = \'archived\'"')
    })
  )
  .output(
    z.object({
      deletionTime: z
        .number()
        .optional()
        .describe('Timestamp of the deletion (single delete)'),
      deletedCount: z.number().optional().describe('Number of objects deleted (bulk delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    if (ctx.input.objectId) {
      let result = await client.deleteObject(ctx.input.tableName, ctx.input.objectId);
      return {
        output: {
          deletionTime: result.deletionTime
        },
        message: `Deleted object **${ctx.input.objectId}** from table **${ctx.input.tableName}**.`
      };
    }

    if (ctx.input.where) {
      let count = await client.bulkDeleteObjects(ctx.input.tableName, ctx.input.where);
      return {
        output: {
          deletedCount: count
        },
        message: `Deleted **${count}** objects from table **${ctx.input.tableName}** matching \`${ctx.input.where}\`.`
      };
    }

    return {
      output: {},
      message:
        'No objectId or where clause provided. Please specify either `objectId` for a single delete or `where` for a bulk delete.'
    };
  })
  .build();
