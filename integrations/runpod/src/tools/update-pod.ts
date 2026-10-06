import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let updatePod = SlateTool.create(spec, {
  name: 'Update Pod',
  key: 'update_pod',
  description: `Update a Pod's configuration including its name, container image, disk sizes, environment variables, ports, and other settings. Some changes take effect on the next restart. GPU type and mount kind cannot be changed.`,
  constraints: [
    'Some changes take effect on the next start or restart.',
    'GPU type cannot be changed via update.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      podId: z.string().describe('ID of the Pod to update'),
      name: z.string().optional().describe('New name for the Pod'),
      imageName: z.string().optional().describe('New container image'),
      containerDiskInGb: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .optional()
        .describe('New container disk size in GB'),
      volumeInGb: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(10)
        .optional()
        .describe('New persistent volume size in GB'),
      volumeMountPath: z.string().optional().describe('Volume mount path'),
      env: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated environment variables'),
      ports: z.array(z.string()).optional().describe('Updated port mappings'),
      dockerEntrypoint: z.array(z.string()).optional().describe('Override Docker ENTRYPOINT'),
      dockerStartCmd: z.array(z.string()).optional().describe('Override Docker CMD'),
      locked: z.boolean().optional().describe('Prevent stopping the Pod'),
      containerRegistryAuthId: z
        .string()
        .optional()
        .describe('Container registry credentials ID')
    })
  )
  .output(
    z.object({
      podId: z.string().describe('ID of the updated Pod'),
      name: z.string().nullable().describe('Updated name'),
      desiredStatus: z.string().nullable().describe('Current status after update'),
      imageName: z.string().nullable().describe('Container image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let { podId, ...updateData } = ctx.input;

    let p = await client.updatePod(podId, updateData);

    let output = {
      podId: p.id,
      name: p.name ?? null,
      desiredStatus: p.desiredStatus ?? null,
      imageName: p.imageName ?? p.image ?? null
    };

    return {
      output,
      message: `Updated Pod **${output.name ?? output.podId}**.`
    };
  })
  .build();
