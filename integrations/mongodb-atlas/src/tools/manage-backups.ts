import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageBackupsTool = SlateTool.create(spec, {
  name: 'Manage Backups',
  key: 'manage_backups',
  description: `Manage cloud backup snapshots and restore jobs for MongoDB Atlas clusters. List existing snapshots, take on-demand snapshots, view backup schedules, create restore jobs (automated or download), and update backup policies.`,
  instructions: [
    'For dedicated clusters (M10+), cloud backup must be enabled on the cluster.',
    'For restore, specify a deliveryType: "automated" (restore to another cluster), "download" (download link), or "pointInTime" (dedicated clusters only).'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      clusterName: z.string().describe('Cluster name'),
      action: z
        .enum([
          'list_snapshots',
          'get_snapshot',
          'create_snapshot',
          'list_restore_jobs',
          'create_restore_job',
          'get_schedule',
          'update_schedule'
        ])
        .describe('Action to perform'),
      snapshotId: z.string().optional().describe('Snapshot ID (for get_snapshot)'),
      description: z.string().optional().describe('Description for on-demand snapshot'),
      retentionInDays: z
        .number()
        .optional()
        .describe('Retention period for on-demand snapshot (days)'),
      deliveryType: z
        .enum(['automated', 'download', 'pointInTime'])
        .optional()
        .describe('Restore job delivery type'),
      targetClusterName: z
        .string()
        .optional()
        .describe('Target cluster for automated restore'),
      targetProjectId: z.string().optional().describe('Target project for automated restore'),
      pointInTimeUtcSeconds: z
        .number()
        .optional()
        .describe('Point-in-time restore timestamp (Unix seconds)'),
      oplogTs: z.number().optional().describe('Oplog timestamp for point-in-time restore'),
      oplogInc: z.number().optional().describe('Oplog increment for point-in-time restore'),
      scheduleData: z.any().optional().describe('Backup schedule configuration data')
    })
  )
  .output(
    z.object({
      snapshot: z.any().optional(),
      snapshots: z.array(z.any()).optional(),
      restoreJob: z.any().optional(),
      restoreJobs: z.array(z.any()).optional(),
      schedule: z.any().optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required. Provide it in input or config.');

    let { action, clusterName } = ctx.input;

    if (action === 'list_snapshots') {
      let result = await client.listBackupSnapshots(projectId, clusterName);
      let snapshots = result.results || [];
      return {
        output: { snapshots, totalCount: result.totalCount || snapshots.length },
        message: `Found **${snapshots.length}** snapshot(s) for cluster **${clusterName}**.`
      };
    }

    if (action === 'get_snapshot') {
      if (!ctx.input.snapshotId) throw new Error('snapshotId is required.');
      let snapshot = await client.getBackupSnapshot(
        projectId,
        clusterName,
        ctx.input.snapshotId
      );
      return {
        output: { snapshot },
        message: `Retrieved snapshot **${ctx.input.snapshotId}** (status: ${snapshot.status}).`
      };
    }

    if (action === 'create_snapshot') {
      let data = {
        description: ctx.input.description || 'On-demand snapshot',
        retentionInDays: ctx.input.retentionInDays || 1
      };
      let snapshot = await client.createBackupSnapshot(projectId, clusterName, data);
      return {
        output: { snapshot },
        message: `On-demand snapshot creation initiated for cluster **${clusterName}**.`
      };
    }

    if (action === 'list_restore_jobs') {
      let result = await client.listBackupRestoreJobs(projectId, clusterName);
      let restoreJobs = result.results || [];
      return {
        output: { restoreJobs, totalCount: result.totalCount || restoreJobs.length },
        message: `Found **${restoreJobs.length}** restore job(s) for cluster **${clusterName}**.`
      };
    }

    if (action === 'create_restore_job') {
      if (!ctx.input.deliveryType)
        throw new Error('deliveryType is required for restore jobs.');
      let data: any = {
        deliveryType: ctx.input.deliveryType
      };
      if (ctx.input.snapshotId) data.snapshotId = ctx.input.snapshotId;
      if (ctx.input.targetClusterName) data.targetClusterName = ctx.input.targetClusterName;
      if (ctx.input.targetProjectId) data.targetGroupId = ctx.input.targetProjectId;
      if (ctx.input.pointInTimeUtcSeconds)
        data.pointInTimeUTCSeconds = ctx.input.pointInTimeUtcSeconds;
      if (ctx.input.oplogTs) data.oplogTs = ctx.input.oplogTs;
      if (ctx.input.oplogInc) data.oplogInc = ctx.input.oplogInc;

      let restoreJob = await client.createBackupRestoreJob(projectId, clusterName, data);
      return {
        output: { restoreJob },
        message: `Restore job created for cluster **${clusterName}** (type: ${ctx.input.deliveryType}).`
      };
    }

    if (action === 'get_schedule') {
      let schedule = await client.getBackupSchedule(projectId, clusterName);
      return {
        output: { schedule },
        message: `Retrieved backup schedule for cluster **${clusterName}**.`
      };
    }

    if (action === 'update_schedule') {
      if (!ctx.input.scheduleData)
        throw new Error('scheduleData is required for update_schedule.');
      let schedule = await client.updateBackupSchedule(
        projectId,
        clusterName,
        ctx.input.scheduleData
      );
      return {
        output: { schedule },
        message: `Updated backup schedule for cluster **${clusterName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
