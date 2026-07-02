import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let databaseSchema = z.object({
  databaseId: z.number().describe('Numeric identifier of the database'),
  branchId: z.string().describe('Branch the database belongs to'),
  name: z.string().describe('Name of the database'),
  ownerName: z.string().describe('Role that owns the database'),
  createdAt: z.string().describe('Timestamp when the database was created'),
  updatedAt: z.string().describe('Timestamp when the database was last updated')
});

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `Lists all databases on a specific branch in a Neon project. Each database belongs to a branch and has an owner role.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch to list databases for')
    })
  )
  .output(
    z.object({
      databases: z.array(databaseSchema).describe('List of databases on the branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.listDatabases(ctx.input.projectId, ctx.input.branchId);

    let databases = (result.databases || []).map((d: any) => ({
      databaseId: d.id,
      branchId: d.branch_id,
      name: d.name,
      ownerName: d.owner_name,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: { databases },
      message: `Found **${databases.length}** database(s) on branch \`${ctx.input.branchId}\`.`
    };
  })
  .build();

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Creates a new database on a branch in a Neon project. Each database requires an owner role. There is a limit of 500 databases per branch.`,
  constraints: ['Maximum 500 databases per branch.']
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch to create the database on'),
      name: z.string().describe('Name for the new database'),
      ownerName: z.string().describe('Name of the role that will own the database')
    })
  )
  .output(
    z.object({
      databaseId: z.number().describe('Numeric identifier of the created database'),
      branchId: z.string().describe('Branch the database was created on'),
      name: z.string().describe('Name of the created database'),
      ownerName: z.string().describe('Role that owns the database'),
      createdAt: z.string().describe('Timestamp when the database was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.createDatabase(ctx.input.projectId, ctx.input.branchId, {
      name: ctx.input.name,
      ownerName: ctx.input.ownerName
    });

    let d = result.database;

    return {
      output: {
        databaseId: d.id,
        branchId: d.branch_id,
        name: d.name,
        ownerName: d.owner_name,
        createdAt: d.created_at
      },
      message: `Created database **${d.name}** owned by \`${d.owner_name}\` on branch \`${d.branch_id}\`.`
    };
  })
  .build();

export let updateDatabase = SlateTool.create(spec, {
  name: 'Update Database',
  key: 'update_database',
  description: `Updates a database's name or owner on a specific branch. Can be used to rename a database or transfer ownership to another role.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch containing the database'),
      databaseName: z.string().describe('Current name of the database to update'),
      name: z.string().optional().describe('New name for the database'),
      ownerName: z.string().optional().describe('New owner role name for the database')
    })
  )
  .output(
    z.object({
      databaseId: z.number().describe('Numeric identifier of the updated database'),
      name: z.string().describe('Updated name of the database'),
      ownerName: z.string().describe('Current owner role of the database'),
      updatedAt: z.string().describe('Timestamp when the database was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.updateDatabase(
      ctx.input.projectId,
      ctx.input.branchId,
      ctx.input.databaseName,
      {
        name: ctx.input.name,
        ownerName: ctx.input.ownerName
      }
    );

    let d = result.database;

    return {
      output: {
        databaseId: d.id,
        name: d.name,
        ownerName: d.owner_name,
        updatedAt: d.updated_at
      },
      message: `Updated database **${d.name}** (owner: \`${d.owner_name}\`).`
    };
  })
  .build();

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Permanently deletes a database from a branch in a Neon project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch containing the database'),
      databaseName: z.string().describe('Name of the database to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the database was successfully deleted'),
      databaseName: z.string().describe('Name of the deleted database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    await client.deleteDatabase(
      ctx.input.projectId,
      ctx.input.branchId,
      ctx.input.databaseName
    );

    return {
      output: {
        deleted: true,
        databaseName: ctx.input.databaseName
      },
      message: `Deleted database **${ctx.input.databaseName}** from branch \`${ctx.input.branchId}\`.`
    };
  })
  .build();
