import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, escapeLiteral } from '../lib/helpers';
import { spec } from '../spec';

export let manageUsers = SlateTool.create(spec, {
  name: 'Manage Users',
  key: 'manage_users',
  description: `Create, drop, or manage MySQL user accounts and their privileges. Supports granting and revoking permissions at the global, database, table, or column level.
Can also list existing users and their grants.`,
  instructions: [
    'User accounts in MySQL are identified by both username and host (e.g., "user"@"localhost").',
    'Use "%" as the host to allow connections from any host.',
    'Be cautious when granting ALL PRIVILEGES or SUPER privilege.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'drop', 'grant', 'revoke', 'list'])
        .describe('Action to perform'),
      userName: z
        .string()
        .optional()
        .describe('MySQL username (required for create, drop, grant, revoke)'),
      host: z
        .string()
        .optional()
        .default('%')
        .describe('Host pattern for the user (default: % for any host)'),
      password: z.string().optional().describe('Password for new user (required for create)'),

      // Grant/Revoke options
      privileges: z
        .array(z.string())
        .optional()
        .describe(
          'Privileges to grant/revoke (e.g., SELECT, INSERT, UPDATE, DELETE, ALL PRIVILEGES)'
        ),
      grantTarget: z
        .string()
        .optional()
        .describe(
          'Target for grant/revoke: "*.*" for global, "database.*" for database-level, "database.table" for table-level'
        ),
      withGrantOption: z
        .boolean()
        .optional()
        .default(false)
        .describe('Allow the user to grant these privileges to others'),

      // Drop options
      ifExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('Add IF EXISTS clause for drop action')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      executedSql: z.string().describe('The SQL statement(s) that were executed'),
      users: z
        .array(
          z.object({
            userName: z.string().describe('Username'),
            host: z.string().describe('Host pattern'),
            grants: z.array(z.string()).optional().describe('List of grants for this user')
          })
        )
        .optional()
        .describe('List of users (only for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let statements: string[] = [];

    if (ctx.input.action === 'list') {
      let sql = `SELECT User AS user_name, Host AS host FROM mysql.user ORDER BY User, Host`;
      ctx.info('Listing MySQL users');
      let result = await client.query(sql, ctx.config.queryTimeout);

      let users = result.rows.map((row: any) => ({
        userName: row.user_name as string,
        host: row.host as string
      }));

      return {
        output: {
          success: true,
          executedSql: sql,
          users
        },
        message: `Found **${users.length}** user(s).`
      };
    }

    if (!ctx.input.userName) {
      throw new Error('userName is required for this action');
    }

    let userSpec = `${escapeLiteral(ctx.input.userName)}@${escapeLiteral(ctx.input.host || '%')}`;

    if (ctx.input.action === 'create') {
      if (!ctx.input.password) {
        throw new Error('password is required when creating a user');
      }
      statements.push(
        `CREATE USER ${userSpec} IDENTIFIED BY ${escapeLiteral(ctx.input.password)}`
      );
    } else if (ctx.input.action === 'drop') {
      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      statements.push(`DROP USER ${ifExists}${userSpec}`);
    } else if (ctx.input.action === 'grant') {
      if (!ctx.input.privileges || ctx.input.privileges.length === 0) {
        throw new Error('privileges are required for grant action');
      }
      let target = ctx.input.grantTarget || '*.*';
      let privs = ctx.input.privileges.join(', ');
      let sql = `GRANT ${privs} ON ${target} TO ${userSpec}`;
      if (ctx.input.withGrantOption) {
        sql += ' WITH GRANT OPTION';
      }
      statements.push(sql);
    } else if (ctx.input.action === 'revoke') {
      if (!ctx.input.privileges || ctx.input.privileges.length === 0) {
        throw new Error('privileges are required for revoke action');
      }
      let target = ctx.input.grantTarget || '*.*';
      let privs = ctx.input.privileges.join(', ');
      statements.push(`REVOKE ${privs} ON ${target} FROM ${userSpec}`);
    }

    let executedSql = statements.join(';\n');
    ctx.info(`Executing: ${executedSql}`);

    for (let stmt of statements) {
      await client.query(stmt, ctx.config.queryTimeout);
    }

    let actionLabel =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'drop'
          ? 'Dropped'
          : ctx.input.action === 'grant'
            ? 'Granted privileges to'
            : 'Revoked privileges from';

    return {
      output: {
        success: true,
        executedSql
      },
      message: `${actionLabel} user \`${ctx.input.userName}@${ctx.input.host || '%'}\`. Executed **${statements.length}** statement(s).`
    };
  })
  .build();
