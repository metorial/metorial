import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getNetworkVolume = SlateTool.create(spec, {
  key: 'get_network_volume',
  name: 'Get Network Volume',
  description:
    'Read a network volume by ID, including its allocated storage, location, and storage tier. Call list_network_volumes to discover IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      networkVolumeId: z.string().min(1).describe('Volume ID from list_network_volumes.')
    })
  )
  .output(
    z.object({
      networkVolumeId: z.string(),
      name: z.string(),
      size: z.number(),
      dataCenterId: z.string(),
      type: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let volume = await new RunPodClient(ctx.auth).getNetworkVolume(ctx.input.networkVolumeId);
    return {
      output: {
        networkVolumeId: volume.id,
        name: volume.name,
        size: volume.size,
        dataCenterId: volume.dataCenterId,
        type: volume.type
      },
      message: `Retrieved network volume ${volume.name}.`
    };
  })
  .build();
