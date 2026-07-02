import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let manageWatchTool = SlateTool.create(spec, {
  name: 'Manage Watch',
  key: 'manage_watch',
  description: `Create, update, delete, execute, activate, or deactivate Watcher alerts. Watches monitor data changes by running scheduled queries and triggering actions (email, webhook, index, logging) when conditions are met.`,
  instructions: [
    'A watch has four building blocks: trigger (schedule), input (query), condition, and actions.',
    'Use "execute" to test a watch immediately without waiting for its schedule.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'delete', 'execute', 'activate', 'deactivate'])
        .describe('Watch action to perform'),
      watchId: z.string().describe('The watch identifier'),
      trigger: z
        .record(z.string(), z.any())
        .optional()
        .describe('Schedule trigger (e.g., { "schedule": { "interval": "10m" } })'),
      watchInput: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input query/data source for the watch'),
      condition: z
        .record(z.string(), z.any())
        .optional()
        .describe('Condition that determines if actions should fire'),
      actions: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Actions to execute when the condition is met (email, webhook, index, logging)'
        ),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional metadata to attach to the watch')
    })
  )
  .output(
    z.object({
      watchId: z.string().describe('The watch identifier'),
      acknowledged: z.boolean().optional().describe('Whether the request was acknowledged'),
      watchStatus: z
        .record(z.string(), z.any())
        .optional()
        .describe('Watch status information'),
      executionResult: z
        .record(z.string(), z.any())
        .optional()
        .describe('Results from watch execution'),
      watchDefinition: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full watch definition')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.action) {
      case 'create': {
        let body: Record<string, any> = {};
        if (ctx.input.trigger) body.trigger = ctx.input.trigger;
        if (ctx.input.watchInput) body.input = ctx.input.watchInput;
        if (ctx.input.condition) body.condition = ctx.input.condition;
        if (ctx.input.actions) body.actions = ctx.input.actions;
        if (ctx.input.metadata) body.metadata = ctx.input.metadata;
        let result = await client.putWatch(ctx.input.watchId, body);
        return {
          output: {
            watchId: result._id,
            acknowledged: true,
            watchStatus: result.status
          },
          message: `Watch **${ctx.input.watchId}** ${result.created ? 'created' : 'updated'}.`
        };
      }
      case 'get': {
        let result = await client.getWatch(ctx.input.watchId);
        return {
          output: {
            watchId: result._id,
            watchStatus: result.status,
            watchDefinition: result.watch
          },
          message: `Retrieved watch **${ctx.input.watchId}** (status: ${result.status?.state?.active ? 'active' : 'inactive'}).`
        };
      }
      case 'delete': {
        let result = await client.deleteWatch(ctx.input.watchId);
        return {
          output: {
            watchId: result._id,
            acknowledged: result.found ?? true
          },
          message: `Watch **${ctx.input.watchId}** deleted.`
        };
      }
      case 'execute': {
        let result = await client.executeWatch(ctx.input.watchId);
        return {
          output: {
            watchId: result._id,
            executionResult: result.watch_record
          },
          message: `Watch **${ctx.input.watchId}** executed.`
        };
      }
      case 'activate': {
        let result = await client.activateWatch(ctx.input.watchId);
        return {
          output: {
            watchId: ctx.input.watchId,
            watchStatus: result.status,
            acknowledged: true
          },
          message: `Watch **${ctx.input.watchId}** activated.`
        };
      }
      case 'deactivate': {
        let result = await client.deactivateWatch(ctx.input.watchId);
        return {
          output: {
            watchId: ctx.input.watchId,
            watchStatus: result.status,
            acknowledged: true
          },
          message: `Watch **${ctx.input.watchId}** deactivated.`
        };
      }
    }
  })
  .build();
