import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateMachine = SlateTool.create(spec, {
  name: 'Update Machine',
  key: 'update_machine',
  description: `Update a Fly Machine's configuration. Requires the full config object (partial updates are not supported). The machine's region and name are immutable.`,
  instructions: [
    'The entire config must be provided — this is a full replacement, not a partial update.',
    'If the machine has a lease, provide the leaseNonce to authorize the update.'
  ],
  constraints: ['Region and name cannot be changed after creation.']
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the machine to update'),
      leaseNonce: z
        .string()
        .optional()
        .describe('Lease nonce if the machine has an active lease'),
      image: z.string().describe('Container image to run'),
      guest: z
        .object({
          cpus: z.number().optional().describe('Number of CPU cores'),
          memoryMb: z.number().optional().describe('Memory in MB'),
          cpuKind: z.enum(['shared', 'performance']).optional().describe('CPU type'),
          gpuKind: z.string().optional().describe('GPU type')
        })
        .optional()
        .describe('Resource configuration'),
      size: z.string().optional().describe('Named VM size preset'),
      env: z.record(z.string(), z.string()).optional().describe('Environment variables'),
      services: z
        .array(
          z.object({
            ports: z.array(
              z.object({
                port: z.number().describe('External port'),
                handlers: z.array(z.string()).optional().describe('Connection handlers'),
                forceHttps: z.boolean().optional().describe('Redirect HTTP to HTTPS')
              })
            ),
            protocol: z.string().describe('Protocol (tcp or udp)'),
            internalPort: z.number().describe('Internal port')
          })
        )
        .optional()
        .describe('Service configurations'),
      mounts: z
        .array(
          z.object({
            volume: z.string().describe('Volume ID'),
            path: z.string().describe('Mount path')
          })
        )
        .optional()
        .describe('Volume mounts'),
      metadata: z.record(z.string(), z.string()).optional().describe('Machine metadata'),
      restart: z
        .object({
          policy: z.enum(['no', 'on-failure', 'always']).optional(),
          maxRetries: z.number().optional()
        })
        .optional()
        .describe('Restart policy'),
      autoDestroy: z.boolean().optional().describe('Auto-destroy on exit')
    })
  )
  .output(
    z.object({
      machineId: z.string().describe('Machine identifier'),
      machineName: z.string().describe('Machine name'),
      state: z.string().describe('Current state'),
      region: z.string().describe('Region'),
      instanceId: z.string().describe('Instance ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let machine = await client.updateMachine(ctx.input.appName, ctx.input.machineId, {
      leaseNonce: ctx.input.leaseNonce,
      config: {
        image: ctx.input.image,
        guest: ctx.input.guest,
        size: ctx.input.size,
        env: ctx.input.env,
        services: ctx.input.services,
        mounts: ctx.input.mounts,
        metadata: ctx.input.metadata,
        restart: ctx.input.restart,
        autoDestroy: ctx.input.autoDestroy
      }
    });

    return {
      output: {
        machineId: machine.machineId,
        machineName: machine.machineName,
        state: machine.state,
        region: machine.region,
        instanceId: machine.instanceId
      },
      message: `Updated machine **${machine.machineName || machine.machineId}** — now in state **${machine.state}**.`
    };
  })
  .build();
