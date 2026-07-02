import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageBackups = SlateTool.create(spec, {
  name: 'Manage Backups',
  key: 'manage_backups',
  description: `Create, list, or delete on-demand backups for DynamoDB tables. Also supports viewing and toggling point-in-time recovery (PITR) settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'delete', 'describe_pitr', 'enable_pitr', 'disable_pitr'])
        .describe('Backup action to perform'),
      tableName: z
        .string()
        .optional()
        .describe(
          'Table name (required for create, list, describe_pitr, enable_pitr, disable_pitr)'
        ),
      backupName: z.string().optional().describe('Name for the backup (required for create)'),
      backupArn: z.string().optional().describe('ARN of the backup (required for delete)'),
      limit: z.number().optional().describe('Maximum number of backups to list')
    })
  )
  .output(
    z.object({
      backupArn: z.string().optional().describe('ARN of the created backup'),
      backupStatus: z.string().optional().describe('Status of the backup'),
      backups: z
        .array(
          z.object({
            backupArn: z.string(),
            backupName: z.string(),
            backupStatus: z.string(),
            tableName: z.string(),
            backupCreationTimestamp: z.string().optional()
          })
        )
        .optional()
        .describe('List of backups'),
      pitrEnabled: z.boolean().optional().describe('Whether PITR is enabled'),
      pitrStatus: z.string().optional().describe('PITR status'),
      earliestRestorableTimestamp: z
        .string()
        .optional()
        .describe('Earliest point you can restore to'),
      latestRestorableTimestamp: z
        .string()
        .optional()
        .describe('Latest point you can restore to')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.tableName || !ctx.input.backupName) {
        throw new Error('tableName and backupName are required for creating a backup');
      }
      let result = await client.createBackup({
        tableName: ctx.input.tableName,
        backupName: ctx.input.backupName
      });
      let details = result.BackupDetails;
      return {
        output: {
          backupArn: details.BackupArn,
          backupStatus: details.BackupStatus
        },
        message: `Created backup **${ctx.input.backupName}** for table **${ctx.input.tableName}** (status: ${details.BackupStatus})`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listBackups({
        tableName: ctx.input.tableName,
        limit: ctx.input.limit
      });
      let backups = (result.BackupSummaries || []).map((b: any) => ({
        backupArn: b.BackupArn,
        backupName: b.BackupName,
        backupStatus: b.BackupStatus,
        tableName: b.TableName,
        backupCreationTimestamp: b.BackupCreationDateTime
          ? String(b.BackupCreationDateTime)
          : undefined
      }));
      return {
        output: { backups },
        message: `Found **${backups.length}** backups${ctx.input.tableName ? ` for table **${ctx.input.tableName}**` : ''}`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.backupArn) {
        throw new Error('backupArn is required for deleting a backup');
      }
      let result = await client.deleteBackup(ctx.input.backupArn);
      let details = result.BackupDescription?.BackupDetails;
      return {
        output: {
          backupArn: ctx.input.backupArn,
          backupStatus: details?.BackupStatus || 'DELETED'
        },
        message: `Deleted backup ${ctx.input.backupArn}`
      };
    }

    if (ctx.input.action === 'describe_pitr') {
      if (!ctx.input.tableName) {
        throw new Error('tableName is required for describing PITR');
      }
      let result = await client.describeContinuousBackups(ctx.input.tableName);
      let pitr = result.ContinuousBackupsDescription?.PointInTimeRecoveryDescription;
      return {
        output: {
          pitrEnabled: pitr?.PointInTimeRecoveryStatus === 'ENABLED',
          pitrStatus: pitr?.PointInTimeRecoveryStatus,
          earliestRestorableTimestamp: pitr?.EarliestRestorableDateTime
            ? String(pitr.EarliestRestorableDateTime)
            : undefined,
          latestRestorableTimestamp: pitr?.LatestRestorableDateTime
            ? String(pitr.LatestRestorableDateTime)
            : undefined
        },
        message: `PITR for **${ctx.input.tableName}** is **${pitr?.PointInTimeRecoveryStatus || 'UNKNOWN'}**`
      };
    }

    if (ctx.input.action === 'enable_pitr' || ctx.input.action === 'disable_pitr') {
      if (!ctx.input.tableName) {
        throw new Error('tableName is required for updating PITR');
      }
      let enabled = ctx.input.action === 'enable_pitr';
      await client.updateContinuousBackups({
        tableName: ctx.input.tableName,
        pointInTimeRecoveryEnabled: enabled
      });
      return {
        output: {
          pitrEnabled: enabled,
          pitrStatus: enabled ? 'ENABLED' : 'DISABLED'
        },
        message: `PITR ${enabled ? 'enabled' : 'disabled'} for **${ctx.input.tableName}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
