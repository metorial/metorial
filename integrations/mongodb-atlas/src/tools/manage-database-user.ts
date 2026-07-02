import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { invalidAction, requireString, resolveProjectId } from '../lib/validation';
import { spec } from '../spec';

let roleSchema = z.object({
  roleName: z.string().describe('Role name (e.g., readWrite, dbAdmin, atlasAdmin, read)'),
  databaseName: z
    .string()
    .optional()
    .describe('Database the role applies to. Use "admin" for cluster-wide roles.'),
  collectionName: z.string().optional().describe('Collection the role applies to')
});

let scopeSchema = z.object({
  name: z.string().describe('Name of the cluster or data lake'),
  type: z.enum(['CLUSTER', 'DATA_LAKE']).describe('Type of resource')
});

export let manageDatabaseUserTool = SlateTool.create(spec, {
  name: 'Manage Database User',
  key: 'manage_database_user',
  description: `Create, update, list, or delete database users in a MongoDB Atlas project. Configure authentication methods (SCRAM, X.509, AWS IAM, LDAP, OIDC), assign roles for fine-grained access control, and scope users to specific clusters.`,
  instructions: [
    'For SCRAM auth, provide username and password.',
    'The databaseName in roles determines scope: use "admin" for built-in roles like readWriteAnyDatabase.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      username: z
        .string()
        .optional()
        .describe('Database username (required for get/create/update/delete)'),
      password: z.string().optional().describe('Password for SCRAM authentication'),
      authDatabaseName: z
        .string()
        .optional()
        .describe(
          'Authentication database (default: "admin"). Use "$external" for X.509, LDAP, AWS IAM, OIDC.'
        ),
      roles: z.array(roleSchema).optional().describe('Database roles to assign'),
      scopes: z
        .array(scopeSchema)
        .optional()
        .describe('Restrict user to specific clusters or data lakes'),
      deleteAfterDate: z
        .string()
        .optional()
        .describe('ISO 8601 date after which the user is automatically deleted'),
      ldapAuthType: z.enum(['USER', 'GROUP']).optional().describe('LDAP authentication type'),
      x509Type: z
        .enum(['NONE', 'MANAGED', 'CUSTOMER'])
        .optional()
        .describe('X.509 certificate type'),
      awsIAMType: z.enum(['NONE', 'USER', 'ROLE']).optional().describe('AWS IAM type'),
      oidcAuthType: z
        .enum(['NONE', 'IDP_GROUP', 'USER'])
        .optional()
        .describe('OIDC authentication type')
    })
  )
  .output(
    z.object({
      user: z.any().optional().describe('Database user details'),
      users: z.array(z.any()).optional().describe('List of database users'),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let { action, username } = ctx.input;
    let authDb = ctx.input.authDatabaseName || 'admin';

    if (action === 'list') {
      let result = await client.listDatabaseUsers(projectId);
      let users = result.results || [];
      return {
        output: { users, totalCount: result.totalCount || users.length },
        message: `Found **${users.length}** database user(s).`
      };
    }

    username = requireString(username, 'username', 'for this action');

    if (action === 'get') {
      let user = await client.getDatabaseUser(projectId, authDb, username);
      return {
        output: { user },
        message: `Retrieved database user **${username}**.`
      };
    }

    if (action === 'create') {
      let data: any = {
        username,
        databaseName: authDb,
        roles: ctx.input.roles || [{ roleName: 'readWriteAnyDatabase', databaseName: 'admin' }]
      };
      if (ctx.input.password) data.password = ctx.input.password;
      if (ctx.input.scopes) data.scopes = ctx.input.scopes;
      if (ctx.input.deleteAfterDate) data.deleteAfterDate = ctx.input.deleteAfterDate;
      if (ctx.input.ldapAuthType) data.ldapAuthType = ctx.input.ldapAuthType;
      if (ctx.input.x509Type) data.x509Type = ctx.input.x509Type;
      if (ctx.input.awsIAMType) data.awsIAMType = ctx.input.awsIAMType;
      if (ctx.input.oidcAuthType) data.oidcAuthType = ctx.input.oidcAuthType;

      let user = await client.createDatabaseUser(projectId, data);
      return {
        output: { user },
        message: `Database user **${username}** created.`
      };
    }

    if (action === 'update') {
      let data: any = {};
      if (ctx.input.password) data.password = ctx.input.password;
      if (ctx.input.roles) data.roles = ctx.input.roles;
      if (ctx.input.scopes) data.scopes = ctx.input.scopes;
      if (ctx.input.deleteAfterDate) data.deleteAfterDate = ctx.input.deleteAfterDate;

      let user = await client.updateDatabaseUser(projectId, authDb, username, data);
      return {
        output: { user },
        message: `Database user **${username}** updated.`
      };
    }

    if (action === 'delete') {
      await client.deleteDatabaseUser(projectId, authDb, username);
      return {
        output: {},
        message: `Database user **${username}** deleted.`
      };
    }

    return invalidAction(action);
  })
  .build();
