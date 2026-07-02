import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

let snapshotSchema = z.object({
  snapshotId: z.string().describe('Unique identifier of the snapshot'),
  clusterName: z.string().optional().describe('Cluster the snapshot belongs to'),
  snapshotType: z.string().optional().describe('Type of snapshot (onDemand, scheduled)'),
  status: z
    .string()
    .optional()
    .describe('Snapshot status (queued, inProgress, completed, failed)'),
  storageSizeBytes: z.number().optional().describe('Size of the snapshot in bytes'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  expiresAt: z.string().optional().describe('ISO 8601 expiration timestamp'),
  mongodVersion: z.string().optional().describe('MongoDB version of the snapshot'),
  description: z.string().optional().describe('Description of the snapshot')
});

let restoreJobSchema = z.object({
  restoreJobId: z.string().describe('Unique identifier of the restore job'),
  snapshotId: z.string().optional().describe('Snapshot being restored'),
  deliveryType: z
    .string()
    .optional()
    .describe('Delivery type (automated, download, pointInTime)'),
  targetClusterName: z.string().optional().describe('Target cluster for the restore'),
  targetGroupId: z.string().optional().describe('Target project for the restore'),
  status: z.string().optional().describe('Restore job status'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  finishedAt: z.string().optional().describe('ISO 8601 completion timestamp')
});

export let manageBackupsTool = SlateTool.create(spec, {
  name: 'Manage Backups',
  key: 'manage_backups',
  description: `List backup snapshots, take on-demand snapshots, list restore jobs, or create restore jobs for a MongoDB Atlas cluster. Supports automated and point-in-time restores to the same or different clusters.`,
  instructions: [
    'For on-demand snapshots, you may provide a description and retention period.',
    'Restore delivery types: "automated" restores to a cluster, "download" provides a download link, "pointInTime" restores to a specific time.',
    'For automated restores, provide targetClusterName and optionally targetGroupId.'
  ],
  constraints: [
    'Cloud backups are not available for M0 Free clusters.',
    'Snapshots are immutable and cannot be modified after creation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_snapshots',
          'get_snapshot',
          'take_snapshot',
          'list_restore_jobs',
          'create_restore_job',
          'get_schedule',
          'update_schedule'
        ])
        .describe('Backup action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      clusterName: z.string().describe('Cluster name'),
      snapshotId: z
        .string()
        .optional()
        .describe('Snapshot ID (for get_snapshot, create_restore_job)'),
      description: z.string().optional().describe('Description for on-demand snapshot'),
      retentionInDays: z.number().optional().describe('Number of days to retain the snapshot'),
      deliveryType: z
        .enum(['automated', 'download', 'pointInTime'])
        .optional()
        .describe('Restore delivery type'),
      targetClusterName: z
        .string()
        .optional()
        .describe('Target cluster for automated restore'),
      targetGroupId: z.string().optional().describe('Target project ID for restore'),
      pointInTimeUTCSeconds: z
        .number()
        .optional()
        .describe('UTC timestamp in seconds for point-in-time restore'),
      scheduleData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Backup schedule configuration to update')
    })
  )
  .output(
    z.object({
      snapshots: z.array(snapshotSchema).optional().describe('List of snapshots'),
      snapshot: snapshotSchema.optional().describe('Single snapshot'),
      restoreJobs: z.array(restoreJobSchema).optional().describe('List of restore jobs'),
      restoreJob: restoreJobSchema.optional().describe('Created restore job'),
      schedule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Backup schedule configuration'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw mongodbServiceError('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list_snapshots') {
      let result = await client.listBackupSnapshots(projectId, ctx.input.clusterName);
      let snapshots = (result.results || []).map((s: any) => ({
        snapshotId: s.id,
        clusterName: s.clusterName,
        snapshotType: s.snapshotType,
        status: s.status,
        storageSizeBytes: s.storageSizeBytes,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        mongodVersion: s.mongodVersion,
        description: s.description
      }));
      return {
        output: { snapshots, totalCount: result.totalCount ?? snapshots.length },
        message: `Found **${snapshots.length}** snapshot(s) for cluster **${ctx.input.clusterName}**.`
      };
    }

    if (ctx.input.action === 'get_snapshot') {
      if (!ctx.input.snapshotId) throw mongodbServiceError('snapshotId is required');
      let s = await client.getBackupSnapshot(
        projectId,
        ctx.input.clusterName,
        ctx.input.snapshotId
      );
      return {
        output: {
          snapshot: {
            snapshotId: s.id,
            clusterName: s.clusterName,
            snapshotType: s.snapshotType,
            status: s.status,
            storageSizeBytes: s.storageSizeBytes,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            mongodVersion: s.mongodVersion,
            description: s.description
          }
        },
        message: `Snapshot **${s.id}**: ${s.status} (${s.snapshotType}).`
      };
    }

    if (ctx.input.action === 'take_snapshot') {
      let s = await client.createOnDemandSnapshot(projectId, ctx.input.clusterName, {
        description: ctx.input.description,
        retentionInDays: ctx.input.retentionInDays
      });
      return {
        output: {
          snapshot: {
            snapshotId: s.id,
            clusterName: s.clusterName,
            snapshotType: s.snapshotType,
            status: s.status,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            description: s.description
          }
        },
        message: `Taking on-demand snapshot for **${ctx.input.clusterName}**. Snapshot ID: ${s.id}.`
      };
    }

    if (ctx.input.action === 'list_restore_jobs') {
      let result = await client.listBackupRestoreJobs(projectId, ctx.input.clusterName);
      let restoreJobs = (result.results || []).map((j: any) => ({
        restoreJobId: j.id,
        snapshotId: j.snapshotId,
        deliveryType: j.deliveryType,
        targetClusterName: j.targetClusterName,
        targetGroupId: j.targetGroupId,
        status: j.status,
        createdAt: j.createdAt,
        finishedAt: j.finishedAt
      }));
      return {
        output: { restoreJobs, totalCount: result.totalCount ?? restoreJobs.length },
        message: `Found **${restoreJobs.length}** restore job(s) for cluster **${ctx.input.clusterName}**.`
      };
    }

    if (ctx.input.action === 'create_restore_job') {
      if (!ctx.input.deliveryType) throw mongodbServiceError('deliveryType is required');
      let payload: any = { deliveryType: ctx.input.deliveryType };
      if (ctx.input.snapshotId) payload.snapshotId = ctx.input.snapshotId;
      if (ctx.input.targetClusterName) payload.targetClusterName = ctx.input.targetClusterName;
      if (ctx.input.targetGroupId) payload.targetGroupId = ctx.input.targetGroupId;
      if (ctx.input.pointInTimeUTCSeconds)
        payload.pointInTimeUTCSeconds = ctx.input.pointInTimeUTCSeconds;

      let j = await client.createRestoreJob(projectId, ctx.input.clusterName, payload);
      return {
        output: {
          restoreJob: {
            restoreJobId: j.id,
            snapshotId: j.snapshotId,
            deliveryType: j.deliveryType,
            targetClusterName: j.targetClusterName,
            targetGroupId: j.targetGroupId,
            status: j.status,
            createdAt: j.createdAt
          }
        },
        message: `Created restore job **${j.id}** (${ctx.input.deliveryType}).`
      };
    }

    if (ctx.input.action === 'get_schedule') {
      let schedule = await client.getBackupSchedule(projectId, ctx.input.clusterName);
      return {
        output: { schedule },
        message: `Retrieved backup schedule for **${ctx.input.clusterName}**.`
      };
    }

    if (ctx.input.action === 'update_schedule') {
      if (!ctx.input.scheduleData) throw mongodbServiceError('scheduleData is required');
      let schedule = await client.updateBackupSchedule(
        projectId,
        ctx.input.clusterName,
        ctx.input.scheduleData
      );
      return {
        output: { schedule },
        message: `Updated backup schedule for **${ctx.input.clusterName}**.`
      };
    }

    throw mongodbServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
