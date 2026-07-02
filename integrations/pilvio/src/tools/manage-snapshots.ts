import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let replicaSchema = z.object({
  replicaUuid: z.string().describe('Replica/snapshot UUID'),
  replicaType: z.string().optional().describe('Type of replica (snapshot or backup)'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  sizeGb: z.number().optional().describe('Replica size in GB')
});

export let manageSnapshots = SlateTool.create(spec, {
  name: 'Manage Snapshots',
  key: 'manage_snapshots',
  description: `List, create, delete, or restore VM snapshots. Snapshots are point-in-time copies of VM storage that can be used to restore or clone VMs.`,
  instructions: [
    'Use "list" to view all snapshots/backups for a VM.',
    'Use "create" to take a new snapshot of a VM.',
    'Use "restore" to rebuild a VM from a specific snapshot.',
    'Use "delete" to remove a snapshot (requires replicaUuid).'
  ],
  constraints: ['Automatic backups keep up to 4 weekly copies.']
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete', 'restore']).describe('Operation to perform'),
      vmUuid: z.string().describe('UUID of the VM'),
      replicaUuid: z
        .string()
        .optional()
        .describe('UUID of the snapshot/replica (required for "delete" and "restore")'),
      replicaType: z
        .enum(['snapshot', 'backup'])
        .optional()
        .describe('Filter by type when listing (default: snapshot)')
    })
  )
  .output(
    z.object({
      replicas: z
        .array(replicaSchema)
        .optional()
        .describe('List of replicas (for "list" action)'),
      success: z.boolean().describe('Whether the operation succeeded'),
      vmUuid: z.string().optional().describe('UUID of the affected VM')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action, vmUuid } = ctx.input;

    switch (action) {
      case 'list': {
        let data = await client.listReplicas(vmUuid, ctx.input.replicaType);
        let replicas = (Array.isArray(data) ? data : []).map((r: any) => ({
          replicaUuid: r.uuid || r.replica_uuid,
          replicaType: r.r_type || r.type,
          createdAt: r.created_at,
          sizeGb: r.size_gb
        }));
        return {
          output: { replicas, success: true, vmUuid },
          message: `Found **${replicas.length}** replica(s) for VM **${vmUuid}**.`
        };
      }

      case 'create': {
        let _result = await client.createReplica(vmUuid);
        return {
          output: { success: true, vmUuid },
          message: `Created snapshot for VM **${vmUuid}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.replicaUuid) {
          throw new Error('replicaUuid is required for delete action');
        }
        await client.deleteReplica(ctx.input.replicaUuid);
        return {
          output: { success: true, vmUuid },
          message: `Deleted snapshot **${ctx.input.replicaUuid}**.`
        };
      }

      case 'restore': {
        if (!ctx.input.replicaUuid) {
          throw new Error('replicaUuid is required for restore action');
        }
        await client.rebuildFromReplica(vmUuid, ctx.input.replicaUuid);
        return {
          output: { success: true, vmUuid },
          message: `Restored VM **${vmUuid}** from snapshot **${ctx.input.replicaUuid}**.`
        };
      }
    }
  })
  .build();
