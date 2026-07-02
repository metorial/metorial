import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let createObject = SlateTool.create(spec, {
  name: 'Create Object',
  key: 'create_object',
  description: `Creates one or more new objects in a Backendless database table. Supports single object creation and bulk creation of up to 100 objects at once. New tables and columns are created dynamically if they don't already exist.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the database table to create the object(s) in'),
      record: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('A single object to create, with property names as keys'),
      records: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'An array of objects to create in bulk (max 100). Use this instead of record for batch creation.'
        )
    })
  )
  .output(
    z.object({
      createdObject: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The created object with its assigned objectId (single creation)'),
      createdObjectIds: z
        .array(z.string())
        .optional()
        .describe('Array of objectIds for bulk-created objects'),
      count: z.number().describe('Number of objects created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    if (ctx.input.records && ctx.input.records.length > 0) {
      let objectIds = await client.bulkCreateObjects(ctx.input.tableName, ctx.input.records);
      return {
        output: {
          createdObjectIds: objectIds,
          count: objectIds.length
        },
        message: `Created **${objectIds.length}** objects in table **${ctx.input.tableName}**.`
      };
    }

    if (ctx.input.record) {
      let created = await client.createObject(ctx.input.tableName, ctx.input.record);
      return {
        output: {
          createdObject: created,
          count: 1
        },
        message: `Created object with ID **${created.objectId}** in table **${ctx.input.tableName}**.`
      };
    }

    return {
      output: { count: 0 },
      message:
        'No record or records provided. Please specify either `record` for single creation or `records` for bulk creation.'
    };
  })
  .build();
