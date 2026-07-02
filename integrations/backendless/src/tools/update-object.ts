import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let updateObject = SlateTool.create(spec, {
  name: 'Update Object',
  key: 'update_object',
  description: `Updates one or more existing objects in a Backendless database table. Supports updating a single object by ID or bulk-updating all objects matching a where clause.`,
  instructions: [
    'For single update, provide `objectId` and the properties to change in `properties`.',
    'For bulk update, provide a `where` clause and the properties to set on all matching objects.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the database table'),
      objectId: z.string().optional().describe('ID of a specific object to update'),
      where: z
        .string()
        .optional()
        .describe('Where clause for bulk update, e.g. "status = \'pending\'"'),
      properties: z
        .record(z.string(), z.unknown())
        .describe('Properties to update on the matching object(s)')
    })
  )
  .output(
    z.object({
      updatedObject: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The updated object (single update)'),
      updatedCount: z.number().optional().describe('Number of objects updated (bulk update)')
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
      let updated = await client.updateObject(
        ctx.input.tableName,
        ctx.input.objectId,
        ctx.input.properties
      );
      return {
        output: {
          updatedObject: updated
        },
        message: `Updated object **${ctx.input.objectId}** in table **${ctx.input.tableName}**.`
      };
    }

    if (ctx.input.where) {
      let count = await client.bulkUpdateObjects(
        ctx.input.tableName,
        ctx.input.where,
        ctx.input.properties
      );
      return {
        output: {
          updatedCount: count
        },
        message: `Updated **${count}** objects in table **${ctx.input.tableName}** matching \`${ctx.input.where}\`.`
      };
    }

    return {
      output: {},
      message:
        'No objectId or where clause provided. Please specify either `objectId` for a single update or `where` for a bulk update.'
    };
  })
  .build();
