import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let describeBackup = SlateTool.create(spec, {
  name: 'Describe Backup',
  key: 'describe_backup',
  description:
    'Describe an existing DynamoDB on-demand backup, including backup status and source table details.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      backupArn: z.string().describe('ARN of the DynamoDB backup')
    })
  )
  .output(
    z.object({
      backupArn: z.string().describe('ARN of the backup'),
      backupName: z.string().optional().describe('Name of the backup'),
      backupStatus: z.string().optional().describe('Current backup status'),
      backupType: z.string().optional().describe('Backup type'),
      backupSizeBytes: z.number().optional().describe('Backup size in bytes'),
      backupCreationTimestamp: z.string().optional().describe('When the backup was created'),
      backupExpiryTimestamp: z.string().optional().describe('When the backup expires'),
      sourceTableName: z.string().optional().describe('Source table name'),
      sourceTableArn: z.string().optional().describe('Source table ARN'),
      sourceTableId: z.string().optional().describe('Source table ID'),
      sourceTableSizeBytes: z.number().optional().describe('Source table size in bytes'),
      sourceItemCount: z.number().optional().describe('Approximate source item count')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.describeBackup(ctx.input.backupArn);
    let details = result.BackupDescription?.BackupDetails || {};
    let sourceTable = result.BackupDescription?.SourceTableDetails || {};

    return {
      output: {
        backupArn: details.BackupArn || ctx.input.backupArn,
        backupName: details.BackupName,
        backupStatus: details.BackupStatus,
        backupType: details.BackupType,
        backupSizeBytes: details.BackupSizeBytes,
        backupCreationTimestamp: details.BackupCreationDateTime
          ? String(details.BackupCreationDateTime)
          : undefined,
        backupExpiryTimestamp: details.BackupExpiryDateTime
          ? String(details.BackupExpiryDateTime)
          : undefined,
        sourceTableName: sourceTable.TableName,
        sourceTableArn: sourceTable.TableArn,
        sourceTableId: sourceTable.TableId,
        sourceTableSizeBytes: sourceTable.TableSizeBytes,
        sourceItemCount: sourceTable.ItemCount
      },
      message: `Backup **${details.BackupName || ctx.input.backupArn}** is **${details.BackupStatus || 'UNKNOWN'}**`
    };
  })
  .build();
