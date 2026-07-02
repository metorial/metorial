import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listToolProviders = SlateTool.create(spec, {
  name: 'List Tool Providers',
  key: 'list_tool_providers',
  description: `List all available tool providers (integrations) in Stack AI. Providers offer actions and triggers for interacting with external services like web search, databases, and third-party APIs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      providers: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of available tool providers with their IDs and capabilities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let providers = await client.listToolProviders();

    return {
      output: { providers },
      message: `Found **${providers.length}** tool provider(s).`
    };
  })
  .build();

export let runAction = SlateTool.create(spec, {
  name: 'Run Action',
  key: 'run_action',
  description: `Execute a specific action from a tool provider. Actions allow workflows to interact with external systems like sending data, updating databases, or triggering web searches.
Use **List Tool Providers** to discover available providers and their actions.`,
  instructions: [
    'First use List Tool Providers to find available provider and action IDs.',
    "The inputs object must match the action's expected input schema."
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      providerId: z.string().describe('The tool provider ID'),
      actionId: z.string().describe('The action ID to execute'),
      inputs: z
        .record(z.string(), z.unknown())
        .describe("Input parameters for the action, matching the action's input schema")
    })
  )
  .output(
    z.object({
      actionResult: z
        .record(z.string(), z.unknown())
        .describe('The result returned by the action execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.runAction(
      ctx.input.providerId,
      ctx.input.actionId,
      ctx.input.inputs
    );

    return {
      output: { actionResult: result },
      message: `Executed action **${ctx.input.actionId}** from provider **${ctx.input.providerId}**.`
    };
  })
  .build();
