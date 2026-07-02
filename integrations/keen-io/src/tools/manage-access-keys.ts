import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accessKeyDefinitionSchema = z
  .object({
    name: z.string().optional().describe('Human-readable name for the key'),
    isActive: z.boolean().optional().describe('Whether the key is active'),
    permitted: z
      .array(
        z.enum(['writes', 'queries', 'saved_queries', 'cached_queries', 'datasets', 'schema'])
      )
      .optional()
      .describe('Permitted operations'),
    options: z
      .object({
        reads: z
          .object({
            allowed: z
              .array(z.string())
              .optional()
              .describe('Event collections allowed for reading')
          })
          .optional(),
        writes: z
          .object({
            allowed: z
              .array(z.string())
              .optional()
              .describe('Event collections allowed for writing'),
            autofill: z
              .record(z.string(), z.any())
              .optional()
              .describe('Properties to automatically include on events written with this key')
          })
          .optional(),
        queries: z
          .object({
            filters: z
              .array(
                z.object({
                  propertyName: z.string(),
                  operator: z.string(),
                  propertyValue: z.any()
                })
              )
              .optional()
              .describe('Automatic filters applied to queries made with this key')
          })
          .optional()
      })
      .optional()
      .describe('Scoped access options for the key')
  })
  .describe('Access key configuration');

export let manageAccessKeys = SlateTool.create(spec, {
  name: 'Manage Access Keys',
  key: 'manage_access_keys',
  description: `List, get, create, update, or revoke Keen.io Access Keys. Access Keys are custom API keys that grant scoped access to specific data and operations. Useful for building customer-facing analytics where each customer sees only their own data.`,
  instructions: [
    'Requires a Master Key for authentication.',
    'Use "create" with permitted operations and optional filters to scope data access per user.',
    'Use "revoke" to disable an access key. Use "unrevoke" to re-enable it.'
  ],
  constraints: ['This tool requires Master Key authentication.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'revoke', 'unrevoke'])
        .describe('The operation to perform'),
      accessKeyId: z
        .string()
        .optional()
        .describe(
          'ID of the access key. Required for "get", "update", "revoke", and "unrevoke" actions.'
        ),
      keyDefinition: accessKeyDefinitionSchema
        .optional()
        .describe('Access key configuration. Required for "create" and "update" actions.')
    })
  )
  .output(
    z.object({
      accessKeys: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of access keys (for "list" action)'),
      accessKey: z.record(z.string(), z.any()).optional().describe('Access key details'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let keys = await client.listAccessKeys();
        return {
          output: { accessKeys: keys, success: true },
          message: `Found **${keys.length}** access keys.`
        };
      }

      case 'get': {
        if (!ctx.input.accessKeyId)
          throw new Error('accessKeyId is required for "get" action');
        let key = await client.getAccessKey(ctx.input.accessKeyId);
        return {
          output: { accessKey: key, success: true },
          message: `Retrieved access key **${ctx.input.accessKeyId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.keyDefinition)
          throw new Error('keyDefinition is required for "create" action');
        let def: Record<string, any> = {};
        if (ctx.input.keyDefinition.name) def.name = ctx.input.keyDefinition.name;
        if (ctx.input.keyDefinition.isActive !== undefined)
          def.is_active = ctx.input.keyDefinition.isActive;
        if (ctx.input.keyDefinition.permitted)
          def.permitted = ctx.input.keyDefinition.permitted;
        if (ctx.input.keyDefinition.options) {
          def.options = {};
          if (ctx.input.keyDefinition.options.reads) {
            def.options.reads = { allowed: ctx.input.keyDefinition.options.reads.allowed };
          }
          if (ctx.input.keyDefinition.options.writes) {
            def.options.writes = {};
            if (ctx.input.keyDefinition.options.writes.allowed)
              def.options.writes.allowed = ctx.input.keyDefinition.options.writes.allowed;
            if (ctx.input.keyDefinition.options.writes.autofill)
              def.options.writes.autofill = ctx.input.keyDefinition.options.writes.autofill;
          }
          if (ctx.input.keyDefinition.options.queries) {
            def.options.queries = {};
            if (ctx.input.keyDefinition.options.queries.filters) {
              def.options.queries.filters =
                ctx.input.keyDefinition.options.queries.filters.map(f => ({
                  property_name: f.propertyName,
                  operator: f.operator,
                  property_value: f.propertyValue
                }));
            }
          }
        }
        let created = await client.createAccessKey(def);
        return {
          output: { accessKey: created, success: true },
          message: `Created access key **${created.name || created.key}**.`
        };
      }

      case 'update': {
        if (!ctx.input.accessKeyId)
          throw new Error('accessKeyId is required for "update" action');
        if (!ctx.input.keyDefinition)
          throw new Error('keyDefinition is required for "update" action');
        let def: Record<string, any> = {};
        if (ctx.input.keyDefinition.name) def.name = ctx.input.keyDefinition.name;
        if (ctx.input.keyDefinition.isActive !== undefined)
          def.is_active = ctx.input.keyDefinition.isActive;
        if (ctx.input.keyDefinition.permitted)
          def.permitted = ctx.input.keyDefinition.permitted;
        if (ctx.input.keyDefinition.options) {
          def.options = {};
          if (ctx.input.keyDefinition.options.reads) {
            def.options.reads = { allowed: ctx.input.keyDefinition.options.reads.allowed };
          }
          if (ctx.input.keyDefinition.options.writes) {
            def.options.writes = {};
            if (ctx.input.keyDefinition.options.writes.allowed)
              def.options.writes.allowed = ctx.input.keyDefinition.options.writes.allowed;
            if (ctx.input.keyDefinition.options.writes.autofill)
              def.options.writes.autofill = ctx.input.keyDefinition.options.writes.autofill;
          }
          if (ctx.input.keyDefinition.options.queries) {
            def.options.queries = {};
            if (ctx.input.keyDefinition.options.queries.filters) {
              def.options.queries.filters =
                ctx.input.keyDefinition.options.queries.filters.map(f => ({
                  property_name: f.propertyName,
                  operator: f.operator,
                  property_value: f.propertyValue
                }));
            }
          }
        }
        let updated = await client.updateAccessKey(ctx.input.accessKeyId, def);
        return {
          output: { accessKey: updated, success: true },
          message: `Updated access key **${ctx.input.accessKeyId}**.`
        };
      }

      case 'revoke': {
        if (!ctx.input.accessKeyId)
          throw new Error('accessKeyId is required for "revoke" action');
        await client.revokeAccessKey(ctx.input.accessKeyId);
        return {
          output: { success: true },
          message: `Revoked access key **${ctx.input.accessKeyId}**.`
        };
      }

      case 'unrevoke': {
        if (!ctx.input.accessKeyId)
          throw new Error('accessKeyId is required for "unrevoke" action');
        let key = await client.unrevokeAccessKey(ctx.input.accessKeyId);
        return {
          output: { accessKey: key, success: true },
          message: `Unrevoked access key **${ctx.input.accessKeyId}**.`
        };
      }
    }
  });
