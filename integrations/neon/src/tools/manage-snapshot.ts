import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { neonValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  branchSchema,
  mapBranch,
  mapOperation,
  mapSnapshot,
  operationSchema,
  snapshotSchema
} from './shared';

export let listSnapshots = SlateTool.create(spec, {
  name: 'List Snapshots',
  key: 'list_snapshots',
  description: `Lists snapshots for a Neon project. Snapshots are point-in-time backups of project data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list snapshots for')
    })
  )
  .output(
    z.object({
      snapshots: z.array(snapshotSchema).describe('Snapshots for the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.listSnapshots(ctx.input.projectId);
    let snapshots = (result.snapshots || []).map(mapSnapshot);

    return {
      output: { snapshots },
      message: `Found **${snapshots.length}** snapshot(s) for project \`${ctx.input.projectId}\`.`
    };
  })
  .build();

export let createSnapshot = SlateTool.create(spec, {
  name: 'Create Snapshot',
  key: 'create_snapshot',
  description: `Creates a point-in-time snapshot from a Neon branch. Provide either lsn or timestamp to snapshot a specific historical point, not both.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch to snapshot'),
      name: z.string().optional().describe('Name for the snapshot'),
      lsn: z.string().optional().describe('Log Sequence Number to snapshot from'),
      timestamp: z.string().optional().describe('ISO 8601 timestamp to snapshot from'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the snapshot should be automatically deleted')
    })
  )
  .output(
    z.object({
      snapshot: snapshotSchema.describe('Created snapshot'),
      operations: z.array(operationSchema).describe('Operations created by snapshot creation')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.lsn && ctx.input.timestamp) {
      throw neonValidationError(
        'Provide either lsn or timestamp when creating a snapshot, not both.'
      );
    }

    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.createSnapshot(ctx.input.projectId, ctx.input.branchId, {
      name: ctx.input.name,
      lsn: ctx.input.lsn,
      timestamp: ctx.input.timestamp,
      expiresAt: ctx.input.expiresAt
    });
    let snapshot = mapSnapshot(result.snapshot);
    let operations = (result.operations || []).map(mapOperation);

    return {
      output: { snapshot, operations },
      message: `Created snapshot **${snapshot.name}** (${snapshot.snapshotId}).`
    };
  })
  .build();

export let updateSnapshot = SlateTool.create(spec, {
  name: 'Update Snapshot',
  key: 'update_snapshot',
  description: `Renames a Neon project snapshot.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      snapshotId: z.string().describe('ID of the snapshot to update'),
      name: z.string().describe('New snapshot name')
    })
  )
  .output(snapshotSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.updateSnapshot(ctx.input.projectId, ctx.input.snapshotId, {
      name: ctx.input.name
    });
    let snapshot = mapSnapshot(result.snapshot);

    return {
      output: snapshot,
      message: `Updated snapshot **${snapshot.name}** (${snapshot.snapshotId}).`
    };
  })
  .build();

export let deleteSnapshot = SlateTool.create(spec, {
  name: 'Delete Snapshot',
  key: 'delete_snapshot',
  description: `Deletes a Neon project snapshot.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      snapshotId: z.string().describe('ID of the snapshot to delete')
    })
  )
  .output(
    z.object({
      snapshotId: z.string().describe('ID of the deleted snapshot'),
      deleted: z.boolean().describe('Whether the delete request was accepted'),
      operations: z.array(operationSchema).describe('Operations created by deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.deleteSnapshot(ctx.input.projectId, ctx.input.snapshotId);
    let operations = (result.operations || []).map(mapOperation);

    return {
      output: {
        snapshotId: ctx.input.snapshotId,
        deleted: true,
        operations
      },
      message: `Deleted snapshot **${ctx.input.snapshotId}**.`
    };
  })
  .build();

export let restoreSnapshot = SlateTool.create(spec, {
  name: 'Restore Snapshot',
  key: 'restore_snapshot',
  description: `Restores a Neon snapshot to a branch. By default Neon creates a restored branch for preview; set finalizeRestore only when you intend to replace the target branch.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      snapshotId: z.string().describe('ID of the snapshot to restore'),
      name: z.string().optional().describe('Name for the newly restored branch'),
      targetBranchId: z
        .string()
        .optional()
        .describe('Branch ID to restore into. Defaults to the snapshot source branch.'),
      finalizeRestore: z
        .boolean()
        .optional()
        .describe('Whether to finalize restore immediately and replace the target branch')
    })
  )
  .output(
    z.object({
      branch: branchSchema.describe('Branch restored from the snapshot'),
      operations: z.array(operationSchema).describe('Operations created by restore')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.restoreSnapshot(ctx.input.projectId, ctx.input.snapshotId, {
      name: ctx.input.name,
      targetBranchId: ctx.input.targetBranchId,
      finalizeRestore: ctx.input.finalizeRestore
    });
    let branch = mapBranch(result.branch);
    let operations = (result.operations || []).map(mapOperation);

    return {
      output: { branch, operations },
      message: `Restored snapshot **${ctx.input.snapshotId}** to branch **${branch.name}** (${branch.branchId}).`
    };
  })
  .build();
