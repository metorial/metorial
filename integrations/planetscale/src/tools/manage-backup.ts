import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBackup = SlateTool.create(spec, {
  name: 'Manage Backup',
  key: 'manage_backup',
  description: `Create, list, get, or delete backups for a database branch. Backups can be used to restore data to a new branch. Configure retention policies and trigger emergency backups (PostgreSQL).`,
  instructions: [
    'Use action "list" to list all backups for a branch.',
    'Use action "create" to create a new backup. Optionally specify retention policy.',
    'Use action "get" to retrieve backup details.',
    'Use action "delete" to permanently remove a backup.',
    'To restore a backup, use the Create Branch tool with the backupId parameter.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branchName: z.string().describe('Name of the branch'),
      action: z.enum(['list', 'create', 'get', 'delete']).describe('Action to perform'),
      backupId: z.string().optional().describe('Backup ID (required for get, delete)'),
      name: z.string().optional().describe('Name for the backup (used with create)'),
      retentionUnit: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe('Retention unit (used with create)'),
      retentionValue: z
        .number()
        .optional()
        .describe('Retention value, 1-1000 (used with create)'),
      emergency: z
        .boolean()
        .optional()
        .describe('Trigger immediate backup, PostgreSQL only (used with create)'),
      page: z.number().optional().describe('Page number for list pagination'),
      perPage: z.number().optional().describe('Results per page for list pagination')
    })
  )
  .output(
    z.object({
      backups: z
        .array(
          z.object({
            backupId: z.string(),
            name: z.string().optional(),
            state: z.string().optional(),
            size: z.number().optional(),
            createdAt: z.string().optional(),
            completedAt: z.string().optional(),
            expiresAt: z.string().optional()
          })
        )
        .optional(),
      backup: z
        .object({
          backupId: z.string(),
          name: z.string().optional(),
          state: z.string().optional(),
          size: z.number().optional(),
          protected: z.boolean().optional(),
          createdAt: z.string().optional(),
          startedAt: z.string().optional(),
          completedAt: z.string().optional(),
          expiresAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      currentPage: z.number().optional(),
      nextPage: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let { databaseName, branchName, action } = ctx.input;

    if (action === 'list') {
      let result = await client.listBackups(databaseName, branchName, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      let backups = result.data.map((b: any) => ({
        backupId: b.id,
        name: b.name,
        state: b.state,
        size: b.size,
        createdAt: b.created_at,
        completedAt: b.completed_at,
        expiresAt: b.expires_at
      }));

      return {
        output: { backups, currentPage: result.currentPage, nextPage: result.nextPage },
        message: `Found **${backups.length}** backup(s) for branch **${branchName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteBackup(databaseName, branchName, ctx.input.backupId!);
      return {
        output: { deleted: true },
        message: `Deleted backup **${ctx.input.backupId}** from branch **${branchName}**.`
      };
    }

    if (action === 'create') {
      let backup = await client.createBackup(databaseName, branchName, {
        name: ctx.input.name,
        retentionUnit: ctx.input.retentionUnit,
        retentionValue: ctx.input.retentionValue,
        emergency: ctx.input.emergency
      });

      return {
        output: {
          backup: {
            backupId: backup.id,
            name: backup.name,
            state: backup.state,
            size: backup.size,
            protected: backup.protected,
            createdAt: backup.created_at,
            startedAt: backup.started_at,
            completedAt: backup.completed_at,
            expiresAt: backup.expires_at
          }
        },
        message: `Created backup **${backup.name || backup.id}** for branch **${branchName}**.`
      };
    }

    // get
    let backup = await client.getBackup(databaseName, branchName, ctx.input.backupId!);
    return {
      output: {
        backup: {
          backupId: backup.id,
          name: backup.name,
          state: backup.state,
          size: backup.size,
          protected: backup.protected,
          createdAt: backup.created_at,
          startedAt: backup.started_at,
          completedAt: backup.completed_at,
          expiresAt: backup.expires_at
        }
      },
      message: `Retrieved backup **${backup.name || backup.id}** (state: ${backup.state}).`
    };
  });
