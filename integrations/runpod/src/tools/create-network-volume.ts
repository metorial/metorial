import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let createNetworkVolume = SlateTool.create(spec, {
  name: 'Create Network Volume',
  key: 'create_network_volume',
  description: `Create a persistent network storage volume that can be attached to Pods and Serverless endpoints. Volumes are region-specific and persist across Pod restarts.`,
  instructions: [
    'Volumes are region-specific and must be in the same data center as the Pods/endpoints that use them.',
    'Example data center IDs: "US-TX-3", "EU-RO-1".'
  ],
  constraints: ['Volume size range: 0-4000 GB.']
})
  .input(
    z.object({
      name: z.string().describe('Name for the network volume'),
      size: z.number().describe('Storage size in GB (0-4000)'),
      dataCenterId: z
        .string()
        .describe('Data center ID where the volume will be created, e.g. "US-TX-3"')
    })
  )
  .output(
    z.object({
      networkVolumeId: z.string().describe('ID of the created volume'),
      name: z.string().nullable().describe('Volume name'),
      size: z.number().nullable().describe('Size in GB'),
      dataCenterId: z.string().nullable().describe('Data center location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let v = await client.createNetworkVolume({
      name: ctx.input.name,
      size: ctx.input.size,
      dataCenterId: ctx.input.dataCenterId
    });

    let output = {
      networkVolumeId: v.id,
      name: v.name ?? null,
      size: v.size ?? null,
      dataCenterId: v.dataCenterId ?? null
    };

    return {
      output,
      message: `Created network volume **${output.name ?? output.networkVolumeId}** (${output.size}GB) in ${output.dataCenterId}.`
    };
  })
  .build();
