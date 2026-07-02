import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageBackup = SlateTool.create(spec, {
  name: 'Manage Backup',
  key: 'manage_backup',
  description: `Create, restore, or check the status of a Weaviate backup. Supports S3, GCS, Azure, and filesystem backends.
- **create**: Start a new backup of all or selected collections.
- **restore**: Restore a previously created backup.
- **status**: Check the status of a backup or restore operation.`,
  instructions: [
    'Backups only include active tenants; inactive or offloaded tenants are excluded.',
    'If no collections are specified, all collections are backed up.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'restore', 'status', 'restore_status'])
        .describe('Backup operation to perform'),
      backend: z
        .enum(['s3', 'gcs', 'azure', 'filesystem'])
        .describe('Storage backend for the backup'),
      backupId: z.string().describe('Unique identifier for the backup'),
      includeCollections: z
        .array(z.string())
        .optional()
        .describe('Collections to include (defaults to all)'),
      excludeCollections: z
        .array(z.string())
        .optional()
        .describe('Collections to exclude from backup')
    })
  )
  .output(
    z
      .object({
        backupId: z.string().describe('Backup identifier'),
        backend: z.string().describe('Storage backend'),
        status: z.string().describe('Backup/restore status'),
        path: z.string().optional().describe('Backup storage path'),
        collections: z.array(z.string()).optional().describe('Collections included'),
        error: z.string().optional().describe('Error message if any')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, backend, backupId, includeCollections, excludeCollections } = ctx.input;

    let result: any;

    switch (action) {
      case 'create':
        result = await client.createBackup(backend, {
          id: backupId,
          include: includeCollections,
          exclude: excludeCollections
        });
        break;
      case 'restore':
        result = await client.restoreBackup(backend, backupId, {
          include: includeCollections,
          exclude: excludeCollections
        });
        break;
      case 'status':
        result = await client.getBackupStatus(backend, backupId);
        break;
      case 'restore_status':
        result = await client.getRestoreStatus(backend, backupId);
        break;
    }

    return {
      output: {
        backupId: result.id || backupId,
        backend: result.backend || backend,
        status: result.status || 'UNKNOWN',
        path: result.path,
        collections: result.classes,
        error: result.error
      },
      message: `Backup **${backupId}** ${action}: status is **${result.status || 'started'}**.`
    };
  })
  .build();
