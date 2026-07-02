import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

let databaseClusterSchema = z.object({
  databaseId: z.string().describe('Unique ID of the database cluster'),
  name: z.string().describe('Name of the database cluster'),
  engine: z
    .string()
    .describe('Database engine (pg, mysql, mongodb, valkey, opensearch, kafka)'),
  version: z.string().describe('Engine version'),
  status: z.string().describe('Current status'),
  size: z.string().describe('Size slug'),
  region: z.string().describe('Region slug'),
  numNodes: z.number().describe('Number of nodes'),
  host: z.string().optional().describe('Connection host'),
  port: z.number().optional().describe('Connection port'),
  uri: z.string().optional().describe('Full connection URI'),
  createdAt: z.string().describe('Creation timestamp'),
  tags: z.array(z.string()).describe('Applied tags')
});

export let listDatabases = SlateTool.create(spec, {
  name: 'List Database Clusters',
  key: 'list_databases',
  description: `List all managed database clusters in your DigitalOcean account. Returns connection details, engine type, size, status, and region for each cluster. Supports filtering by tag.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tagName: z.string().optional().describe('Filter by tag name'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      databases: z.array(databaseClusterSchema),
      totalCount: z.number().describe('Total number of database clusters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDatabaseClusters({
      tagName: ctx.input.tagName,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let databases = result.databases.map((d: any) => ({
      databaseId: d.id,
      name: d.name,
      engine: d.engine,
      version: d.version,
      status: d.status,
      size: d.size,
      region: d.region,
      numNodes: d.num_nodes,
      host: d.connection?.host,
      port: d.connection?.port,
      uri: d.connection?.uri,
      createdAt: d.created_at,
      tags: d.tags || []
    }));

    let totalCount = result.meta?.total || databases.length;

    return {
      output: { databases, totalCount },
      message: `Found **${totalCount}** database cluster(s).`
    };
  })
  .build();

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database Cluster',
  key: 'create_database',
  description: `Provision a new managed database cluster. Supports **PostgreSQL**, **MySQL**, **MongoDB**, **Valkey**, **OpenSearch**, and **Kafka**. Configure engine, version, size, region, and number of nodes.`,
  instructions: [
    'Engine values: "pg" (PostgreSQL), "mysql", "mongodb", "valkey", "opensearch", "kafka"',
    'Common database sizes: "db-s-1vcpu-1gb", "db-s-2vcpu-4gb", "db-s-4vcpu-8gb"'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the database cluster'),
      engine: z
        .enum(['pg', 'mysql', 'mongodb', 'valkey', 'opensearch', 'kafka'])
        .describe('Database engine'),
      version: z.string().optional().describe('Engine version (e.g., "16" for PostgreSQL 16)'),
      size: z.string().describe('Size slug (e.g., "db-s-1vcpu-1gb")'),
      region: z.string().describe('Region slug (e.g., "nyc1")'),
      numNodes: z.number().describe('Number of nodes (1 for single, 2+ for HA)'),
      tags: z.array(z.string()).optional().describe('Tags to apply'),
      privateNetworkUuid: z.string().optional().describe('VPC UUID for private networking')
    })
  )
  .output(databaseClusterSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let d = await client.createDatabaseCluster({
      name: ctx.input.name,
      engine: ctx.input.engine,
      version: ctx.input.version,
      size: ctx.input.size,
      region: ctx.input.region,
      numNodes: ctx.input.numNodes,
      tags: ctx.input.tags,
      privateNetworkUuid: ctx.input.privateNetworkUuid
    });

    return {
      output: {
        databaseId: d.id,
        name: d.name,
        engine: d.engine,
        version: d.version,
        status: d.status,
        size: d.size,
        region: d.region,
        numNodes: d.num_nodes,
        host: d.connection?.host,
        port: d.connection?.port,
        uri: d.connection?.uri,
        createdAt: d.created_at,
        tags: d.tags || []
      },
      message: `Created **${d.engine}** database cluster **${d.name}** (ID: ${d.id}) in **${d.region}** with **${d.num_nodes}** node(s).`
    };
  })
  .build();

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database Cluster',
  key: 'delete_database',
  description: `Permanently delete a managed database cluster. All data stored in the cluster will be lost unless backed up.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database cluster to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the database was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDatabaseCluster(ctx.input.databaseId);

    return {
      output: { deleted: true },
      message: `Deleted database cluster **${ctx.input.databaseId}**.`
    };
  })
  .build();

export let manageDatabaseUsers = SlateTool.create(spec, {
  name: 'Manage Database Users',
  key: 'manage_database_users',
  description: `List, create, or delete users on a managed database cluster. Lists all users when no action is specified. Create or delete a specific user by providing the action and user name.`
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database cluster'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      userName: z.string().optional().describe('User name (required for create/delete)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            name: z.string().describe('User name'),
            role: z.string().optional().describe('User role'),
            password: z
              .string()
              .optional()
              .describe('User password (only available on create)')
          })
        )
        .optional()
        .describe('List of users (for list action)'),
      createdUser: z
        .object({
          name: z.string().describe('User name'),
          password: z.string().optional().describe('User password')
        })
        .optional()
        .describe('Created user details (for create action)'),
      deleted: z.boolean().optional().describe('Whether user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let users = await client.listDatabaseUsers(ctx.input.databaseId);
      return {
        output: {
          users: users.map((u: any) => ({
            name: u.name,
            role: u.role
          }))
        },
        message: `Found **${users.length}** user(s) on database **${ctx.input.databaseId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.userName) {
        throw digitalOceanValidationError('userName is required for create action');
      }
      let user = await client.createDatabaseUser(ctx.input.databaseId, {
        name: ctx.input.userName
      });
      return {
        output: {
          createdUser: {
            name: user.name,
            password: user.password
          }
        },
        message: `Created user **${user.name}** on database **${ctx.input.databaseId}**.`
      };
    }

    if (!ctx.input.userName) {
      throw digitalOceanValidationError('userName is required for delete action');
    }
    await client.deleteDatabaseUser(ctx.input.databaseId, ctx.input.userName);
    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userName}** from database **${ctx.input.databaseId}**.`
    };
  })
  .build();
