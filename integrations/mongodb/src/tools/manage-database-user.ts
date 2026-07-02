import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

let roleSchema = z.object({
  databaseName: z
    .string()
    .describe('Database the role applies to. Use "admin" for built-in roles.'),
  roleName: z
    .string()
    .describe('Name of the role (e.g., readWrite, dbAdmin, atlasAdmin, read)'),
  collectionName: z
    .string()
    .optional()
    .describe('Collection the role applies to. Omit for database-level roles.')
});

let scopeSchema = z.object({
  name: z.string().describe('Name of the cluster or data lake'),
  type: z.enum(['CLUSTER', 'DATA_LAKE']).describe('Type of scope')
});

let dbUserOutputSchema = z.object({
  username: z.string().describe('Username of the database user'),
  databaseName: z.string().describe('Authentication database'),
  roles: z.array(roleSchema).describe('Roles assigned to the user'),
  scopes: z
    .array(scopeSchema)
    .optional()
    .describe('Clusters/data lakes the user has access to'),
  deleteAfterDate: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the user will be automatically deleted'),
  deleted: z.boolean().optional().describe('Whether the user was deleted')
});

export let manageDatabaseUserTool = SlateTool.create(spec, {
  name: 'Manage Database User',
  key: 'manage_database_user',
  description: `Create, update, list, or delete database users in a MongoDB Atlas project. Database users authenticate to MongoDB databases with specific roles and privileges. Supports SCRAM, X.509, LDAP, and AWS IAM authentication types.`,
  instructions: [
    'For SCRAM authentication, set databaseName to "admin" and provide a password.',
    'Use scopes to restrict user access to specific clusters.',
    'Built-in roles like "readWriteAnyDatabase" or "atlasAdmin" should use databaseName "admin".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      username: z.string().optional().describe('Username (required for get, update, delete)'),
      password: z
        .string()
        .optional()
        .describe('Password for SCRAM authentication (required for create with SCRAM)'),
      databaseName: z
        .string()
        .optional()
        .describe('Authentication database (usually "admin" for SCRAM). Required for create.'),
      roles: z.array(roleSchema).optional().describe('Database roles to assign'),
      scopes: z
        .array(scopeSchema)
        .optional()
        .describe('Restrict access to specific clusters or data lakes'),
      deleteAfterDate: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to auto-delete the user'),
      awsIAMType: z.enum(['NONE', 'USER', 'ROLE']).optional().describe('AWS IAM auth type'),
      x509Type: z
        .enum(['NONE', 'MANAGED', 'CUSTOMER'])
        .optional()
        .describe('X.509 certificate auth type'),
      ldapAuthType: z.enum(['NONE', 'USER', 'GROUP']).optional().describe('LDAP auth type')
    })
  )
  .output(
    z.object({
      users: z
        .array(dbUserOutputSchema)
        .optional()
        .describe('List of database users (for list action)'),
      user: dbUserOutputSchema
        .optional()
        .describe('Single database user (for get, create, update)'),
      totalCount: z.number().optional().describe('Total count for list action')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list') {
      let result = await client.listDatabaseUsers(projectId);
      let users = (result.results || []).map((u: any) => ({
        username: u.username,
        databaseName: u.databaseName,
        roles: u.roles || [],
        scopes: u.scopes,
        deleteAfterDate: u.deleteAfterDate
      }));
      return {
        output: { users, totalCount: result.totalCount ?? users.length },
        message: `Found **${users.length}** database user(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.username) throw new Error('username is required');
      let authDb = ctx.input.databaseName || 'admin';
      let user = await client.getDatabaseUser(projectId, authDb, ctx.input.username);
      return {
        output: {
          user: {
            username: user.username,
            databaseName: user.databaseName,
            roles: user.roles || [],
            scopes: user.scopes,
            deleteAfterDate: user.deleteAfterDate
          }
        },
        message: `Retrieved database user **${user.username}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.username) throw new Error('username is required');
      if (!ctx.input.roles || ctx.input.roles.length === 0)
        throw new Error('At least one role is required');
      let authDb = ctx.input.databaseName || 'admin';

      let payload: any = {
        databaseName: authDb,
        username: ctx.input.username,
        roles: ctx.input.roles
      };
      if (ctx.input.password) payload.password = ctx.input.password;
      if (ctx.input.scopes) payload.scopes = ctx.input.scopes;
      if (ctx.input.deleteAfterDate) payload.deleteAfterDate = ctx.input.deleteAfterDate;
      if (ctx.input.awsIAMType) payload.awsIAMType = ctx.input.awsIAMType;
      if (ctx.input.x509Type) payload.x509Type = ctx.input.x509Type;
      if (ctx.input.ldapAuthType) payload.ldapAuthType = ctx.input.ldapAuthType;

      let user = await client.createDatabaseUser(projectId, payload);
      return {
        output: {
          user: {
            username: user.username,
            databaseName: user.databaseName,
            roles: user.roles || [],
            scopes: user.scopes,
            deleteAfterDate: user.deleteAfterDate
          }
        },
        message: `Created database user **${user.username}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.username) throw new Error('username is required');
      let authDb = ctx.input.databaseName || 'admin';
      let payload: any = {};
      if (ctx.input.roles) payload.roles = ctx.input.roles;
      if (ctx.input.password) payload.password = ctx.input.password;
      if (ctx.input.scopes) payload.scopes = ctx.input.scopes;
      if (ctx.input.deleteAfterDate) payload.deleteAfterDate = ctx.input.deleteAfterDate;

      let user = await client.updateDatabaseUser(
        projectId,
        authDb,
        ctx.input.username,
        payload
      );
      return {
        output: {
          user: {
            username: user.username,
            databaseName: user.databaseName,
            roles: user.roles || [],
            scopes: user.scopes,
            deleteAfterDate: user.deleteAfterDate
          }
        },
        message: `Updated database user **${user.username}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.username) throw new Error('username is required');
      let authDb = ctx.input.databaseName || 'admin';
      await client.deleteDatabaseUser(projectId, authDb, ctx.input.username);
      return {
        output: {
          user: {
            username: ctx.input.username,
            databaseName: authDb,
            roles: [],
            deleted: true
          }
        },
        message: `Deleted database user **${ctx.input.username}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
