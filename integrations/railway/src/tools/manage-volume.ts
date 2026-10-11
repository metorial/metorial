import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVolumesTool = SlateTool.create(spec, {
  name: 'List Volumes',
  key: 'list_volumes',
  description: `List all persistent storage volumes in a Railway project. Provide an environment ID to also list the volume instances in that environment (with mount paths, sizes, and the volume instance IDs used by the volume instance and backup tools).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list volumes for'),
      environmentId: z
        .string()
        .optional()
        .describe(
          'Environment ID to list volume instances for. Call list_environments to find environment IDs.'
        )
    })
  )
  .output(
    z.object({
      volumes: z.array(
        z.object({
          volumeId: z.string().describe('Volume ID'),
          name: z.string().describe('Volume name'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      volumeInstances: z
        .array(
          z.object({
            volumeInstanceId: z.string().describe('Volume instance ID'),
            volumeId: z.string().describe('Volume ID'),
            volumeName: z.string().nullable().describe('Volume name'),
            serviceId: z.string().nullable().describe('Attached service ID'),
            environmentId: z.string().describe('Environment ID'),
            mountPath: z.string().nullable().describe('Mount path inside the container'),
            region: z.string().nullable().describe('Region'),
            state: z.string().nullable().describe('Volume instance state'),
            sizeMB: z.number().nullable().describe('Provisioned size in MB'),
            currentSizeMB: z.number().nullable().describe('Used size in MB'),
            createdAt: z.string().nullable().describe('Creation timestamp')
          })
        )
        .nullable()
        .describe(
          'Volume instances in the requested environment, or null when environmentId is omitted'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let volumes = await client.listVolumes(ctx.input.projectId);

    let mapped = volumes.map((v: any) => ({
      volumeId: v.id,
      name: v.name,
      createdAt: v.createdAt
    }));

    let volumeInstances: any[] | null = null;
    if (ctx.input.environmentId) {
      let instances = await client.listEnvironmentVolumeInstances(ctx.input.environmentId);
      volumeInstances = instances.map((instance: any) => ({
        volumeInstanceId: instance.id,
        volumeId: instance.volumeId,
        volumeName: instance.volume?.name ?? null,
        serviceId: instance.serviceId ?? null,
        environmentId: instance.environmentId,
        mountPath: instance.mountPath ?? null,
        region: instance.region ?? null,
        state: instance.state ?? null,
        sizeMB: instance.sizeMB ?? null,
        currentSizeMB: instance.currentSizeMB ?? null,
        createdAt: instance.createdAt ?? null
      }));
    }

    return {
      output: { volumes: mapped, volumeInstances },
      message: volumeInstances
        ? `Found **${mapped.length}** volume(s) and **${volumeInstances.length}** volume instance(s) in the environment.`
        : `Found **${mapped.length}** volume(s).`
    };
  })
  .build();

export let getVolumeInstanceTool = SlateTool.create(spec, {
  name: 'Get Volume Instance',
  key: 'get_volume_instance',
  description: `Get details for a Railway volume instance in a specific environment, including mount path, size, and state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      volumeInstanceId: z
        .string()
        .describe(
          'ID of the volume instance to retrieve. Call list_volumes with an environmentId to find it.'
        )
    })
  )
  .output(
    z.object({
      volumeInstanceId: z.string(),
      volumeId: z.string(),
      serviceId: z.string().nullable(),
      environmentId: z.string(),
      mountPath: z.string().nullable(),
      region: z.string().nullable(),
      state: z.string().nullable(),
      sizeMB: z.number().nullable(),
      currentSizeMB: z.number().nullable(),
      externalId: z.string().nullable(),
      createdAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let volumeInstance = await client.getVolumeInstance(ctx.input.volumeInstanceId);

    return {
      output: {
        volumeInstanceId: volumeInstance.id,
        volumeId: volumeInstance.volumeId,
        serviceId: volumeInstance.serviceId ?? null,
        environmentId: volumeInstance.environmentId,
        mountPath: volumeInstance.mountPath ?? null,
        region: volumeInstance.region ?? null,
        state: volumeInstance.state ?? null,
        sizeMB: volumeInstance.sizeMB ?? null,
        currentSizeMB: volumeInstance.currentSizeMB ?? null,
        externalId: volumeInstance.externalId ?? null,
        createdAt: volumeInstance.createdAt ?? null
      },
      message: `Volume instance **${volumeInstance.id}** is **${volumeInstance.state ?? 'unknown'}**.`
    };
  })
  .build();

export let createVolumeTool = SlateTool.create(spec, {
  name: 'Create Volume',
  key: 'create_volume',
  description: `Create a new persistent storage volume and attach it to a service. Volumes retain data across deployments. Specify a mount path where the volume will be accessible inside the container.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      serviceId: z.string().describe('ID of the service to attach the volume to'),
      mountPath: z.string().describe('Mount path inside the container (e.g., "/data")'),
      environmentId: z.string().optional().describe('Environment ID to scope the volume to')
    })
  )
  .output(
    z.object({
      volumeId: z.string().describe('ID of the newly created volume'),
      name: z.string().describe('Volume name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let volume = await client.createVolume({
      projectId: ctx.input.projectId,
      serviceId: ctx.input.serviceId,
      mountPath: ctx.input.mountPath,
      environmentId: ctx.input.environmentId
    });

    return {
      output: {
        volumeId: volume.id,
        name: volume.name
      },
      message: `Created volume **${volume.name}** mounted at \`${ctx.input.mountPath}\`.`
    };
  })
  .build();

export let updateVolumeTool = SlateTool.create(spec, {
  name: 'Update Volume',
  key: 'update_volume',
  description: `Rename a persistent storage volume.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      volumeId: z.string().describe('ID of the volume to update'),
      name: z.string().describe('New name for the volume')
    })
  )
  .output(
    z.object({
      volumeId: z.string().describe('Volume ID'),
      name: z.string().describe('Updated volume name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let volume = await client.updateVolume(ctx.input.volumeId, { name: ctx.input.name });

    return {
      output: {
        volumeId: volume.id,
        name: volume.name
      },
      message: `Volume renamed to **${volume.name}**.`
    };
  })
  .build();

export let deleteVolumeTool = SlateTool.create(spec, {
  name: 'Delete Volume',
  key: 'delete_volume',
  description: `Permanently delete a persistent storage volume. All data stored on the volume will be lost. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      volumeId: z.string().describe('ID of the volume to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the volume was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    await client.deleteVolume(ctx.input.volumeId);

    return {
      output: { deleted: true },
      message: `Volume deleted successfully.`
    };
  })
  .build();

export let listVolumeBackupsTool = SlateTool.create(spec, {
  name: 'List Volume Backups',
  key: 'list_volume_backups',
  description: `List backups for a Railway volume instance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      volumeInstanceId: z.string().describe('ID of the volume instance')
    })
  )
  .output(
    z.object({
      backups: z.array(
        z.object({
          backupId: z.string(),
          name: z.string().nullable(),
          createdAt: z.string().nullable(),
          expiresAt: z.string().nullable(),
          usedMB: z.number().nullable(),
          referencedMB: z.number().nullable(),
          volumeInstanceSizeMB: z.number().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let backups = await client.listVolumeBackups(ctx.input.volumeInstanceId);

    let mapped = (backups || []).map((backup: any) => ({
      backupId: backup.id,
      name: backup.name ?? null,
      createdAt: backup.createdAt ?? null,
      expiresAt: backup.expiresAt ?? null,
      usedMB: backup.usedMB ?? null,
      referencedMB: backup.referencedMB ?? null,
      volumeInstanceSizeMB: backup.volumeInstanceSizeMB ?? null
    }));

    return {
      output: { backups: mapped },
      message: `Found **${mapped.length}** volume backup(s).`
    };
  })
  .build();

export let createVolumeBackupTool = SlateTool.create(spec, {
  name: 'Create Volume Backup',
  key: 'create_volume_backup',
  description: `Create a backup for a Railway volume instance. Railway returns a workflow ID for the backup job.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      volumeInstanceId: z.string().describe('ID of the volume instance to back up'),
      name: z.string().optional().describe('Optional backup name')
    })
  )
  .output(
    z.object({
      workflowId: z.string().nullable().describe('Railway workflow ID for the backup job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let backup = await client.createVolumeBackup(ctx.input.volumeInstanceId, ctx.input.name);

    return {
      output: {
        workflowId: backup.workflowId ?? null
      },
      message: backup.workflowId
        ? `Volume backup workflow **${backup.workflowId}** started.`
        : `Volume backup requested.`
    };
  })
  .build();
