import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let manageRelations = SlateTool.create(spec, {
  name: 'Manage Object Relations',
  key: 'manage_relations',
  description:
    'Sets, adds, or removes links between a parent Backendless object and existing child objects. Removing a link keeps the child object in its table.',
  instructions: [
    'Use get_table_schema to inspect relation columns and query_objects to discover parent and child object IDs.',
    'Set replaces existing links. Add preserves existing links. Remove unlinks only the supplied children.',
    'For set or add, a missing relation column can be created by specifying relationName as column:ChildTable:1 or column:ChildTable:n.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      tableName: z.string().min(1).describe('Database table containing the parent object'),
      parentObjectId: z.string().min(1).describe('Parent object ID from query_objects'),
      relationName: z
        .string()
        .min(1)
        .describe(
          'Relation column from get_table_schema; set/add also accept column:ChildTable:1 or column:ChildTable:n'
        ),
      operation: z
        .enum(['set', 'add', 'remove'])
        .describe('Set replaces links, add extends links, remove unlinks supplied children'),
      childObjectIds: z
        .array(z.string().min(1))
        .min(1)
        .describe('Existing child object IDs from query_objects')
    })
  )
  .output(
    z.object({
      tableName: z.string(),
      parentObjectId: z.string(),
      relationName: z.string(),
      operation: z.enum(['set', 'add', 'remove']),
      affectedCount: z
        .number()
        .describe('Number of relations affected, as returned by Backendless')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });
    let affectedCount = await client.manageRelations(
      ctx.input.tableName,
      ctx.input.parentObjectId,
      ctx.input.relationName,
      ctx.input.operation,
      ctx.input.childObjectIds
    );
    return {
      output: {
        tableName: ctx.input.tableName,
        parentObjectId: ctx.input.parentObjectId,
        relationName: ctx.input.relationName,
        operation: ctx.input.operation,
        affectedCount
      },
      message: `${ctx.input.operation} affected **${affectedCount}** links in **${ctx.input.relationName}** for object **${ctx.input.parentObjectId}**.`
    };
  })
  .build();
