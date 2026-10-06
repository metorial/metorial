import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let listComputeTypes = SlateTool.create(spec, {
  name: 'List Compute Types',
  key: 'list_compute_types',
  description:
    'Discover GPU model IDs, GPU pool IDs, CPU flavor IDs, memory, and pricing before creating Pods or Serverless endpoints. GPU Pods use model IDs; GPU endpoints use pool IDs.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      gpus: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          pool: z.string().nullable(),
          memory: z.number(),
          manufacturer: z.string(),
          price: z.record(z.string(), z.number())
        })
      ),
      cpus: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          ramGbPerVcpu: z.number(),
          vcpu: z.object({ min: z.number(), max: z.number() }),
          price: z.record(z.string(), z.number())
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let output = await new RunPodClient(ctx.auth).listComputeTypes();
    return {
      output,
      message: `Found ${output.gpus.length} GPU types and ${output.cpus.length} CPU types.`
    };
  })
  .build();

export let listDataCenters = SlateTool.create(spec, {
  name: 'List Data Centers',
  key: 'list_data_centers',
  description:
    'Discover data center IDs, regions, and supported storage tiers before creating Pods, endpoints, or network volumes.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      dataCenters: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          region: z.string(),
          networkVolumeTypes: z.array(z.string()),
          compliance: z.array(z.string()),
          globalNetwork: z.boolean()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let dataCenters = await new RunPodClient(ctx.auth).listDataCenters();
    return { output: { dataCenters }, message: `Found ${dataCenters.length} data centers.` };
  })
  .build();
