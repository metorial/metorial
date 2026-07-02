import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let manageAliases = SlateTool.create(spec, {
  name: 'Manage Collection Aliases',
  key: 'manage_aliases',
  description: `Creates, deletes, or renames collection aliases. Aliases provide alternative names for collections, useful for versioning or A/B testing. Multiple alias operations can be performed atomically in a single call. Can also list existing aliases.`,
  instructions: [
    'To list all aliases, set `action` to "list". Optionally provide `collectionName` to list aliases for a specific collection.',
    'To create an alias, set `action` to "create" and provide both `aliasName` and `collectionName`.',
    'To delete an alias, set `action` to "delete" and provide `aliasName`.',
    'To rename an alias, set `action` to "rename" and provide both `aliasName` (current) and `newAliasName`.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete', 'rename']).describe('Operation to perform'),
      collectionName: z
        .string()
        .optional()
        .describe('Collection name (required for create, optional for list)'),
      aliasName: z
        .string()
        .optional()
        .describe('Alias name (required for create, delete, rename)'),
      newAliasName: z.string().optional().describe('New alias name (required for rename)')
    })
  )
  .output(
    z.object({
      aliases: z
        .array(
          z.object({
            aliasName: z.string().describe('The alias name'),
            collectionName: z.string().describe('The collection this alias points to')
          })
        )
        .optional()
        .describe('List of aliases (for list action)'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'list') {
      let result: any;
      if (ctx.input.collectionName) {
        result = await client.listCollectionAliases(ctx.input.collectionName);
      } else {
        result = await client.listAliases();
      }

      let aliases = (result.aliases ?? []).map((a: any) => ({
        aliasName: a.alias_name,
        collectionName: a.collection_name
      }));

      return {
        output: { aliases, success: true },
        message: `Found **${aliases.length}** alias(es).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.aliasName || !ctx.input.collectionName) {
        throw new Error('aliasName and collectionName are required for create action');
      }
      await client.updateAliases([
        {
          create_alias: {
            collection_name: ctx.input.collectionName,
            alias_name: ctx.input.aliasName
          }
        }
      ]);
      return {
        output: { success: true },
        message: `Alias \`${ctx.input.aliasName}\` created for collection \`${ctx.input.collectionName}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.aliasName) {
        throw new Error('aliasName is required for delete action');
      }
      await client.updateAliases([{ delete_alias: { alias_name: ctx.input.aliasName } }]);
      return {
        output: { success: true },
        message: `Alias \`${ctx.input.aliasName}\` deleted.`
      };
    }

    if (ctx.input.action === 'rename') {
      if (!ctx.input.aliasName || !ctx.input.newAliasName) {
        throw new Error('aliasName and newAliasName are required for rename action');
      }
      await client.updateAliases([
        {
          rename_alias: {
            old_alias_name: ctx.input.aliasName,
            new_alias_name: ctx.input.newAliasName
          }
        }
      ]);
      return {
        output: { success: true },
        message: `Alias renamed from \`${ctx.input.aliasName}\` to \`${ctx.input.newAliasName}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
