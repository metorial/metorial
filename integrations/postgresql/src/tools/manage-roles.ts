import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from '../lib/errors';
import { createClient, escapeIdentifier, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

export let manageRoles = SlateTool.create(spec, {
  name: 'Manage Roles',
  key: 'manage_roles',
  description: `Manage PostgreSQL roles and their privileges. Supports creating and dropping roles, as well as granting and revoking privileges on databases, schemas, tables, and other objects.`,
  instructions: [
    'The connecting user must have sufficient privileges to manage roles.',
    'Use the grant/revoke actions to control access to specific tables or schemas.'
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

      // For create/drop
      roleName: z.string().optional().describe('Name of the role to create or drop'),
      rolePassword: z.string().optional().describe('Password for the new role (create only)'),
      canLogin: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the role can log in (create only)'),
      isSuperuser: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the role is a superuser (create only)'),
      canCreateDb: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the role can create databases (create only)'),
      ifExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('Add IF EXISTS clause (drop only)'),

      // For grant/revoke
      privileges: z
        .array(
          z.enum([
            'SELECT',
            'INSERT',
            'UPDATE',
            'DELETE',
            'TRUNCATE',
            'REFERENCES',
            'TRIGGER',
            'ALL',
            'USAGE',
            'CREATE',
            'CONNECT',
            'EXECUTE'
          ])
        )
        .optional()
        .describe('Privileges to grant or revoke'),
      on: z
        .object({
          objectType: z
            .enum([
              'TABLE',
              'SCHEMA',
              'DATABASE',
              'SEQUENCE',
              'FUNCTION',
              'ALL TABLES IN SCHEMA',
              'ALL SEQUENCES IN SCHEMA'
            ])
            .describe('Type of object to grant/revoke privileges on'),
          objectName: z.string().describe('Name of the object'),
          schemaName: z
            .string()
            .optional()
            .describe('Schema containing the object (for tables, sequences)')
        })
        .optional()
        .describe('Object to grant/revoke privileges on'),
      grantee: z.string().optional().describe('Role to grant privileges to or revoke from')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      executedSql: z.string().describe('The SQL statement(s) that were executed'),
      roles: z
        .array(
          z.object({
            roleName: z.string().describe('Name of the role'),
            canLogin: z.boolean().describe('Whether the role can log in'),
            isSuperuser: z.boolean().describe('Whether the role is a superuser'),
            canCreateDb: z.boolean().describe('Whether the role can create databases'),
            canCreateRole: z.boolean().describe('Whether the role can create other roles'),
            connectionLimit: z
              .number()
              .describe('Maximum concurrent connections (-1 = unlimited)')
          })
        )
        .optional()
        .describe('List of roles (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let sql: string;

    if (ctx.input.action === 'list') {
      sql = `
        SELECT
          rolname AS role_name,
          rolcanlogin AS can_login,
          rolsuper AS is_superuser,
          rolcreatedb AS can_create_db,
          rolcreaterole AS can_create_role,
          rolconnlimit AS connection_limit
        FROM pg_roles
        WHERE rolname NOT LIKE 'pg_%'
        ORDER BY rolname
      `;

      ctx.info('Listing database roles');
      let result = await client.query(sql, ctx.config.queryTimeout);

      let roles = result.rows.map((row: any) => ({
        roleName: row.role_name as string,
        canLogin: row.can_login === true,
        isSuperuser: row.is_superuser === true,
        canCreateDb: row.can_create_db === true,
        canCreateRole: row.can_create_role === true,
        connectionLimit: Number(row.connection_limit)
      }));

      return {
        output: {
          success: true,
          executedSql: sql.trim(),
          roles
        },
        message: `Found **${roles.length}** role(s).`
      };
    } else if (ctx.input.action === 'create') {
      if (!ctx.input.roleName)
        throw postgresServiceError('roleName is required for create action');

      let options: string[] = [];
      if (ctx.input.canLogin) options.push('LOGIN');
      else options.push('NOLOGIN');
      if (ctx.input.isSuperuser) options.push('SUPERUSER');
      if (ctx.input.canCreateDb) options.push('CREATEDB');
      if (ctx.input.rolePassword)
        options.push(`PASSWORD '${ctx.input.rolePassword.replace(/'/g, "''")}'`);

      sql = `CREATE ROLE ${escapeIdentifier(ctx.input.roleName)} ${options.join(' ')}`;
    } else if (ctx.input.action === 'drop') {
      if (!ctx.input.roleName)
        throw postgresServiceError('roleName is required for drop action');
      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      sql = `DROP ROLE ${ifExists}${escapeIdentifier(ctx.input.roleName)}`;
    } else if (ctx.input.action === 'grant' || ctx.input.action === 'revoke') {
      if (!ctx.input.privileges?.length)
        throw postgresServiceError('privileges are required for grant/revoke actions');
      if (!ctx.input.on)
        throw postgresServiceError(
          'on (object specification) is required for grant/revoke actions'
        );
      if (!ctx.input.grantee)
        throw postgresServiceError('grantee is required for grant/revoke actions');

      let privs = ctx.input.privileges.join(', ');
      let objectType = ctx.input.on.objectType;
      let objectName: string;

      if (objectType === 'TABLE' || objectType === 'SEQUENCE') {
        objectName = qualifiedTableName(ctx.input.on.objectName, ctx.input.on.schemaName);
      } else if (
        objectType === 'ALL TABLES IN SCHEMA' ||
        objectType === 'ALL SEQUENCES IN SCHEMA'
      ) {
        objectName = escapeIdentifier(ctx.input.on.objectName);
      } else {
        objectName = escapeIdentifier(ctx.input.on.objectName);
      }

      let verb = ctx.input.action === 'grant' ? 'GRANT' : 'REVOKE';
      let preposition = ctx.input.action === 'grant' ? 'TO' : 'FROM';

      sql = `${verb} ${privs} ON ${objectType} ${objectName} ${preposition} ${escapeIdentifier(ctx.input.grantee)}`;
    } else {
      throw postgresServiceError(`Unknown action: ${ctx.input.action}`);
    }

    ctx.info(`Executing: ${sql}`);
    await client.query(sql, ctx.config.queryTimeout);

    return {
      output: {
        success: true,
        executedSql: sql
      },
      message: `Successfully executed \`${ctx.input.action.toUpperCase()}\` operation.`
    };
  })
  .build();
