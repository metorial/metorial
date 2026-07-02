import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let managePostgres = SlateTool.create(spec, {
  name: 'Manage Postgres Database',
  key: 'manage_postgres',
  description: `Manage Render Postgres databases. Perform lifecycle actions such as **get**, **create**, **update**, **delete**, **suspend**, **resume**, **restart**, or **failover**. Also supports retrieving **connection_info** and triggering a database **export**.`,
  instructions: [
    'Use action "get" to retrieve database details.',
    'Use "connection_info" to get the connection string and credentials.',
    'Use "export" to trigger a manual backup/export of the database.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'get',
          'create',
          'update',
          'delete',
          'suspend',
          'resume',
          'restart',
          'failover',
          'connection_info',
          'export',
          'list_exports',
          'recovery_info',
          'recover',
          'list_users',
          'create_user',
          'delete_user'
        ])
        .describe('Action to perform'),
      postgresId: z
        .string()
        .optional()
        .describe('Postgres instance ID (required for all actions except create)'),
      name: z.string().optional().describe('Database name (for create/update)'),
      ownerId: z.string().optional().describe('Workspace ID (required for create)'),
      plan: z.string().optional().describe('Instance plan (for create/update)'),
      region: z.string().optional().describe('Region (for create)'),
      version: z.string().optional().describe('Postgres version (for create)'),
      databaseName: z.string().optional().describe('Initial database name (for create)'),
      databaseUser: z.string().optional().describe('Initial database user (for create)'),
      username: z
        .string()
        .optional()
        .describe('Postgres credential username (for create_user/delete_user)'),
      restoreTime: z
        .string()
        .optional()
        .describe('Point-in-time recovery timestamp (ISO 8601, required for recover)'),
      restoreName: z.string().optional().describe('Name of the recovered database'),
      highAvailabilityEnabled: z
        .boolean()
        .optional()
        .describe('Enable high availability (for create/update)')
    })
  )
  .output(
    z.object({
      postgresId: z.string().optional().describe('Postgres instance ID'),
      name: z.string().optional().describe('Database name'),
      status: z.string().optional().describe('Database status'),
      plan: z.string().optional().describe('Instance plan'),
      region: z.string().optional().describe('Region'),
      version: z.string().optional().describe('Postgres version'),
      connectionInfo: z
        .object({
          internalConnectionString: z.string().optional(),
          externalConnectionString: z.string().optional(),
          host: z.string().optional(),
          port: z.string().optional(),
          databaseName: z.string().optional(),
          user: z.string().optional(),
          password: z.string().optional()
        })
        .optional()
        .describe('Connection details (for connection_info action)'),
      exports: z
        .array(
          z.object({
            exportId: z.string().optional().describe('Export ID'),
            status: z.string().optional().describe('Export status'),
            downloadUrl: z.string().optional().describe('Download URL for the export'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            expiresAt: z.string().optional().describe('Expiration timestamp')
          })
        )
        .optional()
        .describe('Postgres exports'),
      users: z
        .array(
          z.object({
            username: z.string().describe('Postgres username'),
            password: z.string().optional().describe('Generated password if returned'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('Postgres credential users'),
      recoveryInfo: z
        .record(z.string(), z.any())
        .optional()
        .describe('Point-in-time recovery status and availability metadata'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action, postgresId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.ownerId) throw createApiServiceError('ownerId is required for create');
      let body: Record<string, any> = {
        ownerId: ctx.input.ownerId,
        name: ctx.input.name,
        plan: ctx.input.plan,
        region: ctx.input.region,
        version: ctx.input.version,
        databaseName: ctx.input.databaseName,
        databaseUser: ctx.input.databaseUser,
        highAvailabilityEnabled: ctx.input.highAvailabilityEnabled
      };
      // Remove undefined fields
      Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
      let pg = await client.createPostgres(body);
      return {
        output: {
          postgresId: pg.id,
          name: pg.name,
          status: pg.status,
          plan: pg.plan,
          region: pg.region,
          version: pg.version,
          success: true
        },
        message: `Created Postgres database **${pg.name}** (\`${pg.id}\`).`
      };
    }

    if (!postgresId) throw createApiServiceError('postgresId is required');

    if (action === 'get') {
      let pg = await client.getPostgres(postgresId);
      return {
        output: {
          postgresId: pg.id,
          name: pg.name,
          status: pg.status,
          plan: pg.plan,
          region: pg.region,
          version: pg.version,
          success: true
        },
        message: `Postgres **${pg.name}** — Plan: ${pg.plan}, Status: ${pg.status || 'unknown'}.`
      };
    }

    if (action === 'connection_info') {
      let info = await client.getPostgresConnectionInfo(postgresId);
      return {
        output: {
          postgresId,
          connectionInfo: {
            internalConnectionString: info.internalConnectionString,
            externalConnectionString: info.externalConnectionString,
            host: info.host,
            port: String(info.port),
            databaseName: info.database,
            user: info.user,
            password: info.password
          },
          success: true
        },
        message: `Connection info retrieved for Postgres \`${postgresId}\`.`
      };
    }

    if (action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.plan) body.plan = ctx.input.plan;
      if (ctx.input.highAvailabilityEnabled !== undefined)
        body.highAvailabilityEnabled = ctx.input.highAvailabilityEnabled;
      let pg = await client.updatePostgres(postgresId, body);
      return {
        output: { postgresId: pg.id, name: pg.name, plan: pg.plan, success: true },
        message: `Updated Postgres **${pg.name}**.`
      };
    }

    if (action === 'export') {
      await client.createPostgresExport(postgresId);
      return {
        output: { postgresId, success: true },
        message: `Export triggered for Postgres \`${postgresId}\`.`
      };
    }

    if (action === 'list_exports') {
      let data = await client.listPostgresExports(postgresId);
      let exports = (Array.isArray(data) ? data : [data]).map((item: any) => {
        let postgresExport = item.export || item.postgresExport || item;
        return {
          exportId: postgresExport.id,
          status: postgresExport.status,
          downloadUrl: postgresExport.url || postgresExport.downloadUrl,
          createdAt: postgresExport.createdAt,
          expiresAt: postgresExport.expiresAt
        };
      });
      return {
        output: { postgresId, exports, success: true },
        message: `Found **${exports.length}** export(s) for Postgres \`${postgresId}\`.`
      };
    }

    if (action === 'recovery_info') {
      let recoveryInfo = await client.getPostgresRecoveryInfo(postgresId);
      return {
        output: { postgresId, recoveryInfo, success: true },
        message: `Retrieved recovery info for Postgres \`${postgresId}\`.`
      };
    }

    if (action === 'recover') {
      if (!ctx.input.restoreTime)
        throw createApiServiceError('restoreTime is required for recover');
      let body: Record<string, any> = { restoreTime: ctx.input.restoreTime };
      if (ctx.input.restoreName) body.restoreName = ctx.input.restoreName;
      if (ctx.input.plan) body.plan = ctx.input.plan;
      let pg = await client.recoverPostgres(postgresId, body);
      return {
        output: {
          postgresId: pg.id,
          name: pg.name,
          status: pg.status,
          plan: pg.plan,
          region: pg.region,
          version: pg.version,
          success: true
        },
        message: `Triggered point-in-time recovery for Postgres \`${postgresId}\`.`
      };
    }

    if (action === 'list_users') {
      let data = await client.listPostgresUsers(postgresId);
      let users = (Array.isArray(data) ? data : [data]).map((item: any) => {
        let user = item.user || item.credential || item;
        return {
          username: user.username,
          password: user.password,
          createdAt: user.createdAt
        };
      });
      return {
        output: { postgresId, users, success: true },
        message: `Found **${users.length}** credential user(s) for Postgres \`${postgresId}\`.`
      };
    }

    if (action === 'create_user') {
      if (!ctx.input.username)
        throw createApiServiceError('username is required for create_user');
      let user = await client.createPostgresUser(postgresId, ctx.input.username);
      let credential = user.user || user.credential || user;
      return {
        output: {
          postgresId,
          users: [
            {
              username: credential.username ?? ctx.input.username,
              password: credential.password,
              createdAt: credential.createdAt
            }
          ],
          success: true
        },
        message: `Created credential user \`${ctx.input.username}\` for Postgres \`${postgresId}\`.`
      };
    }

    if (action === 'delete_user') {
      if (!ctx.input.username)
        throw createApiServiceError('username is required for delete_user');
      await client.deletePostgresUser(postgresId, ctx.input.username);
      return {
        output: { postgresId, success: true },
        message: `Deleted credential user \`${ctx.input.username}\` from Postgres \`${postgresId}\`.`
      };
    }

    // Lifecycle actions
    let actionMap: Record<string, () => Promise<any>> = {
      delete: () => client.deletePostgres(postgresId!),
      suspend: () => client.suspendPostgres(postgresId!),
      resume: () => client.resumePostgres(postgresId!),
      restart: () => client.restartPostgres(postgresId!),
      failover: () => client.triggerPostgresFailover(postgresId!)
    };

    await actionMap[action]!();
    return {
      output: { postgresId, success: true },
      message: `Successfully performed **${action}** on Postgres \`${postgresId}\`.`
    };
  })
  .build();
