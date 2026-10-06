import { pickDefined, SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import {
  collection,
  databaseOutput,
  dbId,
  exact,
  mappedDatabase,
  nativeDatabase,
  nativeTable,
  single
} from '../lib/schemas';
import { connection, fail, id, text, z } from '../lib/validation';
import { spec } from '../spec';
export const manageDatabase = SlateTool.create(spec, {
  name: 'Manage Database',
  key: 'manage_database',
  description:
    'Create, get, update or delete a Softr database. Discover IDs with list_databases; its workspaceId identifies an existing authorized workspace. A workspace with no databases requires its workspace ID from Softr settings. Delete requires an empty database unless force is explicitly true; forced deletion removes its tables and records. Native absence is checked after a 204 receipt; retained history is not erased.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      databaseId: dbId.optional(),
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID from list_databases, or Softr settings for an empty workspace. Create only.'
        ),
      name: z.string().optional(),
      description: z.string().optional(),
      delete: z.boolean().optional(),
      force: z
        .boolean()
        .optional()
        .describe(
          'Delete only. Explicitly allow deletion of a database containing tables and records.'
        )
    })
  )
  .output(z.object({ database: databaseOutput.optional(), deleted: z.boolean().optional() }))
  .handleInvocation(async ctx => {
    const i = ctx.input;
    const client = new DatabaseClient(connection(ctx.auth, ctx.config));
    if (i.force !== undefined && !i.delete) fail('force is accepted only with delete:true.');
    if (i.databaseId !== undefined) {
      id(i.databaseId);
      if (i.workspaceId !== undefined)
        fail('workspaceId is create-only; use the database ID for existing resources.');
    }
    if (i.delete) {
      if (!i.databaseId || i.name !== undefined || i.description !== undefined)
        fail('Delete requires only databaseId, delete:true and optional force.');
      exact(single(nativeDatabase, await client.getDatabase(i.databaseId)), i.databaseId);
      if (!i.force && collection(nativeTable, await client.listTables(i.databaseId)).length)
        fail(
          'The database contains tables. Remove them first, or explicitly authorize force:true.'
        );
      await client.deleteDatabase(i.databaseId, i.force);
      return {
        output: { deleted: true },
        message:
          'Native database absence confirmed after deletion. This does not prove erasure of retained history.'
      };
    }
    if (i.name !== undefined) text(i.name, 'database name');
    if (i.databaseId === undefined) {
      if (i.workspaceId === undefined || i.name === undefined)
        fail(
          'Create requires workspaceId and name; otherwise supply databaseId to read an existing database.'
        );
      const v = single(
        nativeDatabase,
        await client.createDatabase({
          workspaceId: id(i.workspaceId, 'workspace ID'),
          name: i.name,
          description: i.description
        })
      );
      if (v.workspaceId !== i.workspaceId || v.name !== i.name)
        fail(
          'The database creation receipt does not match the requested workspace and name. Reconcile before retrying.',
          'identity_mismatch'
        );
      return {
        output: { database: mappedDatabase(v) },
        message: 'Softr returned the created database and its exact ID.'
      };
    }
    const before = exact(
      single(nativeDatabase, await client.getDatabase(i.databaseId)),
      i.databaseId
    );
    if (i.name === undefined && i.description === undefined)
      return {
        output: { database: mappedDatabase(before) },
        message: 'Returned the exact database.'
      };
    const v = exact(
      single(
        nativeDatabase,
        await client.updateDatabase(
          i.databaseId,
          pickDefined({ name: i.name, description: i.description })
        )
      ),
      i.databaseId
    );
    if (
      v.workspaceId !== before.workspaceId ||
      (i.name !== undefined && v.name !== i.name) ||
      (i.description !== undefined && v.description !== i.description)
    )
      fail(
        'The database update receipt does not match the requested state. Read the database before retrying.',
        'mutation_unverified'
      );
    return {
      output: { database: mappedDatabase(v) },
      message: 'Softr returned the exact updated database.'
    };
  })
  .build();
