import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let serviceSchema = z.object({
  ports: z
    .array(
      z.object({
        port: z.number().describe('External port number'),
        startPort: z.number().optional().describe('Start of external port range'),
        endPort: z.number().optional().describe('End of external port range'),
        handlers: z
          .array(z.string())
          .optional()
          .describe('Connection handlers (e.g. "http", "tls", "proxy_proto")'),
        forceHttps: z.boolean().optional().describe('Redirect HTTP to HTTPS')
      })
    )
    .describe('Port configurations for the service'),
  protocol: z.string().describe('Protocol (tcp or udp)'),
  internalPort: z.number().describe('Port the application listens on inside the machine'),
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
});

let guestSchema = z.object({
  cpus: z.number().optional().describe('Number of CPU cores (default: 1)'),
  memoryMb: z.number().optional().describe('Memory in MB, multiples of 256 (default: 256)'),
  maxMemoryMb: z.number().optional().describe('Maximum memory in MB'),
  cpuKind: z.enum(['shared', 'performance']).optional().describe('CPU type'),
  gpuKind: z.string().optional().describe('GPU type (e.g. "a100-pcie-40gb")'),
  gpus: z.number().optional().describe('Number of GPUs'),
  hostDedicationId: z.string().optional().describe('Dedicated host ID'),
  kernelArgs: z.array(z.string()).optional().describe('Kernel arguments')
});

export let createMachine = SlateTool.create(spec, {
  name: 'Create Machine',
  key: 'create_machine',
  description: `Create a new Fly Machine from a container image in a specific region. Configure CPU, memory, GPU resources, networking services, environment variables, volume mounts, and more.`,
  instructions: [
    'The image field is required and must be a container registry path (e.g. "registry.fly.io/my-app:latest" or "nginx:latest").',
    'If region is omitted, the machine is placed in the nearest region to the WireGuard peer.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App to create the machine in'),
      machineName: z
        .string()
        .optional()
        .describe('Name for the machine (auto-generated if omitted)'),
      region: z
        .string()
        .optional()
        .describe('Region code to deploy in (e.g. "ord", "lhr", "sin", "iad")'),
      skipLaunch: z.boolean().optional().describe('Create the machine but do not start it'),
      skipServiceRegistration: z
        .boolean()
        .optional()
        .describe('Create the machine without registering services with Fly Proxy'),
      skipSecrets: z
        .boolean()
        .optional()
        .describe('Do not inject app secrets into the machine'),
      minSecretsVersion: z
        .number()
        .optional()
        .describe('Minimum app secrets version required before machine creation'),
      image: z
        .string()
        .describe('Container image to run (e.g. "registry.fly.io/my-app:latest")'),
      guest: guestSchema.optional().describe('CPU, memory, and GPU resource configuration'),
      size: z
        .string()
        .optional()
        .describe('Named VM size preset (e.g. "shared-cpu-1x", "performance-2x")'),
      env: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables as key-value pairs'),
      services: z
        .array(serviceSchema)
        .optional()
        .describe('Network service configurations for public routing'),
      mounts: z
        .array(
          z.object({
            volume: z.string().describe('Volume ID to mount'),
            path: z.string().describe('Mount path inside the machine')
          })
        )
        .optional()
        .describe('Volume mounts'),
      init: z
        .object({
          exec: z.array(z.string()).optional().describe('Override exec command'),
          entrypoint: z.array(z.string()).optional().describe('Override ENTRYPOINT'),
          cmd: z.array(z.string()).optional().describe('Override CMD')
        })
        .optional()
        .describe('Process init overrides'),
      restart: z
        .object({
          policy: z
            .enum(['no', 'on-failure', 'always', 'spot-price'])
            .optional()
            .describe('Restart policy'),
          maxRetries: z.number().optional().describe('Max retries for on-failure policy'),
          gpuBidPrice: z.number().optional().describe('GPU bid price for spot Machines')
        })
        .optional()
        .describe('Restart configuration'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Machine metadata key-value pairs'),
      schedule: z
        .enum(['hourly', 'daily', 'weekly', 'monthly'])
        .optional()
        .describe('Run on a recurring schedule'),
      autoDestroy: z
        .boolean()
        .optional()
        .describe('Automatically destroy the machine when it exits')
    })
  )
  .output(
    z.object({
      machineId: z.string().describe('Unique machine identifier'),
      machineName: z.string().describe('Name of the machine'),
      state: z.string().describe('Current state of the machine'),
      region: z.string().describe('Region the machine was created in'),
      instanceId: z.string().describe('Instance ID'),
      privateIp: z.string().describe('Private IPv6 address')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let machine = await client.createMachine(ctx.input.appName, {
      name: ctx.input.machineName,
      region: ctx.input.region,
      skipLaunch: ctx.input.skipLaunch,
      skipServiceRegistration: ctx.input.skipServiceRegistration,
      skipSecrets: ctx.input.skipSecrets,
      minSecretsVersion: ctx.input.minSecretsVersion,
      config: {
        image: ctx.input.image,
        guest: ctx.input.guest,
        size: ctx.input.size,
        env: ctx.input.env,
        services: ctx.input.services,
        mounts: ctx.input.mounts,
        init: ctx.input.init,
        restart: ctx.input.restart,
        metadata: ctx.input.metadata,
        schedule: ctx.input.schedule,
        autoDestroy: ctx.input.autoDestroy
      }
    });

    return {
      output: {
        machineId: machine.machineId,
        machineName: machine.machineName,
        state: machine.state,
        region: machine.region,
        instanceId: machine.instanceId,
        privateIp: machine.privateIp
      },
      message: `Created machine **${machine.machineName || machine.machineId}** in region **${machine.region}** with state **${machine.state}**.`
    };
  })
  .build();
