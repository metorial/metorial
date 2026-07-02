import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

let networkVolumeSchema = z.object({
  networkVolumeId: z.string().describe('Unique identifier'),
  name: z.string().nullable().describe('Volume name'),
  size: z.number().nullable().describe('Size in GB'),
  dataCenterId: z.string().nullable().describe('Data center location')
});

export let listNetworkVolumes = SlateTool.create(spec, {
  name: 'List Network Volumes',
  key: 'list_network_volumes',
  description: `List all persistent network storage volumes in your RunPod account. Network volumes can be attached to Pods and Serverless endpoints, and they persist across restarts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      volumes: z.array(networkVolumeSchema).describe('List of network volumes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let result = await client.listNetworkVolumes();
    let volumes = Array.isArray(result) ? result : [];

    let mapped = volumes.map((v: any) => ({
      networkVolumeId: v.id,
      name: v.name ?? null,
      size: v.size ?? null,
      dataCenterId: v.dataCenterId ?? null
    }));

    return {
      output: { volumes: mapped },
      message: `Found **${mapped.length}** network volume(s).`
    };
  })
  .build();
