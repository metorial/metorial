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
      skipLaunch: z
        .boolean()
        .optional()
        .describe('Update the machine without starting it afterward'),
      skipServiceRegistration: z
        .boolean()
        .optional()
        .describe('Update the machine without registering services with Fly Proxy'),
      skipSecrets: z
        .boolean()
        .optional()
        .describe('Do not inject app secrets into the machine'),
      minSecretsVersion: z
        .number()
        .optional()
        .describe('Minimum app secrets version required before update'),
      currentVersion: z
        .string()
        .optional()
        .describe('Machine version precondition for the update'),
      image: z.string().describe('Container image to run'),
      guest: z
        .object({
          cpus: z.number().optional().describe('Number of CPU cores'),
          memoryMb: z.number().optional().describe('Memory in MB'),
          maxMemoryMb: z.number().optional().describe('Maximum memory in MB'),
          cpuKind: z.enum(['shared', 'performance']).optional().describe('CPU type'),
          gpuKind: z.string().optional().describe('GPU type'),
          gpus: z.number().optional().describe('Number of GPUs'),
          hostDedicationId: z.string().optional().describe('Dedicated host ID'),
          kernelArgs: z.array(z.string()).optional().describe('Kernel arguments')
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
                startPort: z.number().optional().describe('Start of external port range'),
                endPort: z.number().optional().describe('End of external port range'),
                handlers: z.array(z.string()).optional().describe('Connection handlers'),
                forceHttps: z.boolean().optional().describe('Redirect HTTP to HTTPS')
              })
            ),
            protocol: z.string().describe('Protocol (tcp or udp)'),
            internalPort: z.number().describe('Internal port'),
            autostop: z
              .enum(['off', 'stop', 'suspend'])
              .optional()
              .describe('Current Fly Proxy autostop behavior for this service'),
            autostart: z
              .boolean()
              .optional()
              .describe('Automatically start machines on incoming requests'),
            autoStopMachines: z
              .boolean()
              .optional()
              .describe('Deprecated compatibility input; use autostop instead'),
            autoStartMachines: z
              .boolean()
              .optional()
              .describe('Deprecated compatibility input; use autostart instead'),
            minMachinesRunning: z
              .number()
              .optional()
              .describe('Minimum number of machines to keep running'),
            concurrency: z
              .object({
                type: z.string().optional().describe('Concurrency metric type'),
                softLimit: z.number().optional().describe('Preferred concurrency limit'),
                hardLimit: z.number().optional().describe('Maximum concurrency limit')
              })
              .optional()
              .describe('Fly Proxy service concurrency settings')
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
          policy: z.enum(['no', 'on-failure', 'always', 'spot-price']).optional(),
          maxRetries: z.number().optional(),
          gpuBidPrice: z.number().optional()
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
      skipLaunch: ctx.input.skipLaunch,
      skipServiceRegistration: ctx.input.skipServiceRegistration,
      skipSecrets: ctx.input.skipSecrets,
      minSecretsVersion: ctx.input.minSecretsVersion,
      currentVersion: ctx.input.currentVersion,
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
