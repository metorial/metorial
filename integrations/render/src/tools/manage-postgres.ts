import { SlateTool } from 'slates';
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
          'export'
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
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action, postgresId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.ownerId) throw new Error('ownerId is required for create');
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

    if (!postgresId) throw new Error('postgresId is required');

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
