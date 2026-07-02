import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

let volumeSchema = z.object({
  volumeId: z.string().describe('Unique identifier of the volume.'),
  name: z.string().describe('Name of the volume.')
});

export let listVolumes = SlateTool.create(spec, {
  name: 'List Volumes',
  key: 'list_volumes',
  description: `List all storage volumes available to the authenticated team. Volumes provide persistent storage that outlives individual sandbox instances.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      volumes: z.array(volumeSchema).describe('List of available volumes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Fetching volumes...');
    let volumes = await client.listVolumes();

    return {
      output: { volumes },
      message: `Found **${volumes.length}** volume(s).`
    };
  })
  .build();

export let createVolume = SlateTool.create(spec, {
  name: 'Create Volume',
  key: 'create_volume',
  description: `Create a new persistent storage volume. Volumes can be mounted to sandboxes to provide data that persists across sandbox lifecycles.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new volume.')
    })
  )
  .output(volumeSchema)
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Creating volume...');
    let volume = await client.createVolume(ctx.input.name);

    return {
      output: volume,
      message: `Created volume **${volume.name}** (${volume.volumeId}).`
    };
  })
  .build();

export let deleteVolume = SlateTool.create(spec, {
  name: 'Delete Volume',
  key: 'delete_volume',
  description: `Permanently delete a storage volume. All data stored in the volume will be lost.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      volumeId: z.string().describe('The unique identifier of the volume to delete.')
    })
  )
  .output(
    z.object({
      volumeId: z.string().describe('The ID of the deleted volume.'),
      deleted: z.boolean().describe('Whether the volume was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Deleting volume...');
    await client.deleteVolume(ctx.input.volumeId);

    return {
      output: {
        volumeId: ctx.input.volumeId,
        deleted: true
      },
      message: `Volume **${ctx.input.volumeId}** has been permanently deleted.`
    };
  })
  .build();
