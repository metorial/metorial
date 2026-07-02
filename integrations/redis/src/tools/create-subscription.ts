import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let createSubscription = SlateTool.create(spec, {
  name: 'Create Subscription',
  key: 'create_subscription',
  description: `Create a new Redis Cloud subscription. Supports both **Pro** and **Essentials** types.
For Pro subscriptions, specify cloud providers, regions, networking CIDR, and initial databases.
For Essentials subscriptions, specify a plan ID.
Returns a task ID to track the asynchronous creation process.`,
  instructions: [
    'Pro subscriptions require at least one database in the databases array.',
    'Use the "List Essentials Plans" tool to find valid plan IDs for Essentials subscriptions.',
    'Set dryRun to true to estimate costs without creating the subscription.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      type: z.enum(['pro', 'essentials']).describe('Subscription type to create'),
      name: z.string().describe('Subscription name'),
      dryRun: z
        .boolean()
        .default(false)
        .describe('If true, estimates costs without creating the subscription'),
      paymentMethodId: z.number().optional().describe('Payment method ID for billing'),

      // Pro-specific fields
      cloudProviders: z
        .array(
          z.object({
            provider: z.enum(['AWS', 'GCP', 'Azure']).optional().describe('Cloud provider'),
            cloudAccountId: z
              .number()
              .optional()
              .describe('Cloud account ID (use 1 for Redis internal account)'),
            regions: z
              .array(
                z.object({
                  region: z.string().describe('Cloud region identifier (e.g., us-east-1)'),
                  networking: z
                    .object({
                      deploymentCIDR: z
                        .string()
                        .describe('CIDR block for the deployment (e.g., 10.0.0.0/24)')
                    })
                    .optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Cloud provider configuration (Pro only)'),

      databases: z
        .array(
          z.object({
            name: z.string().describe('Database name'),
            protocol: z
              .string()
              .optional()
              .describe('Database protocol (e.g., redis, memcached)'),
            datasetSizeInGb: z.number().optional().describe('Maximum dataset size in GB'),
            memoryLimitInGb: z.number().optional().describe('Memory limit in GB'),
            replication: z.boolean().optional().describe('Enable replication'),
            throughputMeasurement: z
              .object({
                by: z
                  .string()
                  .optional()
                  .describe('Measurement type (e.g., operations-per-second)'),
                value: z.number().optional().describe('Throughput value')
              })
              .optional(),
            quantity: z.number().optional().describe('Number of database instances'),
            modules: z
              .array(
                z.object({
                  name: z.string().describe('Module name')
                })
              )
              .optional()
              .describe('Redis modules to enable')
          })
        )
        .optional()
        .describe('Initial databases to create (required for Pro)'),

      // Essentials-specific
      planId: z.number().optional().describe('Essentials plan ID')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the asynchronous creation'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result: any;

    if (ctx.input.type === 'essentials') {
      let body: Record<string, any> = {
        name: ctx.input.name
      };
      if (ctx.input.planId !== undefined) body.planId = ctx.input.planId;
      if (ctx.input.paymentMethodId !== undefined)
        body.paymentMethodId = ctx.input.paymentMethodId;
      if (ctx.input.dryRun) body.dryRun = true;

      result = await client.createEssentialsSubscription(body);
    } else {
      let body: Record<string, any> = {
        name: ctx.input.name
      };
      if (ctx.input.paymentMethodId !== undefined)
        body.paymentMethodId = ctx.input.paymentMethodId;
      if (ctx.input.cloudProviders) body.cloudProviders = ctx.input.cloudProviders;
      if (ctx.input.databases) body.databases = ctx.input.databases;
      if (ctx.input.dryRun) body.dryRun = true;

      result = await client.createSubscription(body);
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: {
        taskId,
        raw: result
      },
      message: ctx.input.dryRun
        ? `Dry-run complete. Cost estimate returned in task **${taskId}**.`
        : `Subscription creation initiated. Track progress with task ID **${taskId}**.`
    };
  })
  .build();
