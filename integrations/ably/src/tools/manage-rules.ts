import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { spec } from '../spec';

export let manageRules = SlateTool.create(spec, {
  name: 'Manage Integration Rules',
  key: 'manage_rules',
  description: `List, create, update, or delete Ably integration rules using the Control API.
Rules define how events (messages, presence, lifecycle, occupancy) are forwarded to external services like HTTP webhooks, AWS Lambda, Kafka, Amazon Kinesis, SQS, AMQP, and more.`,
  instructions: [
    'Requires Control API Token authentication.',
    'App ID is required for all operations.',
    'Supported rule types: http, aws/lambda, aws/kinesis, aws/sqs, amqp, amqp/external, kafka, pulsar, http/ifttt, http/zapier, http/cloudflare-worker, http/azure-function, http/google-cloud-function.',
    'Event source types: channel.message, channel.presence, channel.lifecycle, channel.occupancy.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      appId: z.string().optional().describe('App ID. Overrides config value if provided.'),
      ruleId: z
        .string()
        .optional()
        .describe('Rule ID. Required for get, update, and delete operations.'),
      ruleType: z
        .string()
        .optional()
        .describe('Rule type (e.g. "http", "aws/lambda", "kafka"). Required for create.'),
      requestMode: z
        .enum(['single', 'batch'])
        .optional()
        .describe(
          'Delivery mode: "single" (one event per request) or "batch" (multiple events per request)'
        ),
      source: z
        .object({
          channelFilter: z.string().describe('Regex pattern to match channel names'),
          type: z
            .enum([
              'channel.message',
              'channel.presence',
              'channel.lifecycle',
              'channel.occupancy'
            ])
            .describe('Event source type')
        })
        .optional()
        .describe('Event source configuration. Required for create.'),
      target: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Target configuration (varies by rule type). For HTTP: { url, format, headers }. For Kafka: { routingKey, brokers, auth }. Required for create.'
        ),
      status: z.enum(['enabled', 'disabled']).optional().describe('Rule status')
    })
  )
  .output(
    z.object({
      rules: z.array(z.any()).optional().describe('List of rules (list action)'),
      rule: z.any().optional().describe('Rule details (get, create, update actions)'),
      deleted: z.boolean().optional().describe('Whether the rule was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyControlClient(ctx.auth.token);
    let appId = ctx.input.appId || ctx.config.appId;
    if (!appId) throw new Error('appId is required. Set it in config or input.');

    if (ctx.input.action === 'list') {
      let rules = await client.listRules(appId);
      return {
        output: { rules },
        message: `Found **${rules.length}** rule(s) for app **${appId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required for getting a rule.');
      let rule = await client.getRule(appId, ctx.input.ruleId);
      return {
        output: { rule },
        message: `Retrieved rule **${rule.id}** (type: ${rule.ruleType}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.ruleType) throw new Error('ruleType is required for creating a rule.');
      if (!ctx.input.source) throw new Error('source is required for creating a rule.');
      if (!ctx.input.target) throw new Error('target is required for creating a rule.');
      let rule = await client.createRule(appId, {
        ruleType: ctx.input.ruleType,
        requestMode: ctx.input.requestMode || 'single',
        source: ctx.input.source,
        target: ctx.input.target,
        status: ctx.input.status
      });
      return {
        output: { rule },
        message: `Created ${ctx.input.ruleType} rule **${rule.id}** for source ${ctx.input.source.type}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required for updating a rule.');
      let rule = await client.updateRule(appId, ctx.input.ruleId, {
        ruleType: ctx.input.ruleType,
        requestMode: ctx.input.requestMode,
        source: ctx.input.source,
        target: ctx.input.target,
        status: ctx.input.status
      });
      return {
        output: { rule },
        message: `Updated rule **${rule.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required for deleting a rule.');
      await client.deleteRule(appId, ctx.input.ruleId);
      return {
        output: { deleted: true },
        message: `Deleted rule **${ctx.input.ruleId}** from app **${appId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
