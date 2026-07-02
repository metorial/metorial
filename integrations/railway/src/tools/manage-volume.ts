import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVolumesTool = SlateTool.create(spec, {
  name: 'List Volumes',
  key: 'list_volumes',
  description: `List all persistent storage volumes in a Railway project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list volumes for')
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
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let volumes = await client.listVolumes(ctx.input.projectId);

    let mapped = volumes.map((v: any) => ({
      volumeId: v.id,
      name: v.name,
      createdAt: v.createdAt
    }));

    return {
      output: { volumes: mapped },
      message: `Found **${mapped.length}** volume(s).`
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
    let client = new Client({ token: ctx.auth.token });
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
    let client = new Client({ token: ctx.auth.token });
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
    let client = new Client({ token: ctx.auth.token });
    await client.deleteVolume(ctx.input.volumeId);

    return {
      output: { deleted: true },
      message: `Volume deleted successfully.`
    };
  })
  .build();
