import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunscopeClient } from '../lib/runscope-client';
import { spec } from '../spec';

export let manageMonitoringEnvironment = SlateTool.create(spec, {
  name: 'Manage Monitoring Environment',
  key: 'manage_monitoring_environment',
  description: `List, create, or update environments for API monitoring tests. Environments define variables, regions, and notification webhooks used during test execution.`,
  instructions: [
    'Use "list" with **bucketKey** and **testId** to see existing environments.',
    'Use "create" to add a new environment with variables and monitoring regions.',
    'Use "update" to modify an existing environment.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('Operation to perform'),
      bucketKey: z.string().describe('Bucket key'),
      testId: z.string().describe('Monitoring test ID'),
      environmentId: z.string().optional().describe('Environment ID (required for update)'),
      name: z.string().optional().describe('Environment name'),
      initialVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of variables used in test steps'),
      regions: z
        .array(z.string())
        .optional()
        .describe('Monitoring regions (e.g., "us1", "eu1", "ap1")'),
      webhooks: z.array(z.string()).optional().describe('Webhook URLs for notifications')
    })
  )
  .output(
    z.object({
      environments: z
        .array(
          z.object({
            environmentId: z.string().describe('Environment ID'),
            name: z.string().describe('Environment name'),
            regions: z.array(z.string()).optional().describe('Active regions')
          })
        )
        .optional()
        .describe('List of environments'),
      environmentId: z.string().optional().describe('Environment ID'),
      name: z.string().optional().describe('Environment name')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.runscopeToken && !ctx.auth.token) {
      throw new Error('Runscope OAuth token is required for API Monitoring operations');
    }
    let client = new RunscopeClient({ token: ctx.auth.runscopeToken || ctx.auth.token });

    if (ctx.input.action === 'list') {
      let envs = await client.listEnvironments(ctx.input.bucketKey, ctx.input.testId);
      let mapped = envs.map((e: any) => ({
        environmentId: e.id,
        name: e.name,
        regions: e.regions
      }));
      return {
        output: { environments: mapped },
        message: `Found **${mapped.length}** environment(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating an environment');
      let env = await client.createEnvironment(ctx.input.bucketKey, ctx.input.testId, {
        name: ctx.input.name,
        initialVariables: ctx.input.initialVariables,
        regions: ctx.input.regions,
        webhooks: ctx.input.webhooks
      });
      return {
        output: { environmentId: env.id, name: env.name },
        message: `Created environment **${env.name}** (ID: ${env.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.environmentId) throw new Error('environmentId is required for updating');
      let env = await client.updateEnvironment(
        ctx.input.bucketKey,
        ctx.input.testId,
        ctx.input.environmentId,
        {
          name: ctx.input.name,
          initialVariables: ctx.input.initialVariables,
          regions: ctx.input.regions,
          webhooks: ctx.input.webhooks
        }
      );
      return {
        output: { environmentId: env.id, name: env.name },
        message: `Updated environment **${env.name}** (ID: ${env.id}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
