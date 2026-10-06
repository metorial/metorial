import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listToolProviders = SlateTool.create(spec, {
  name: 'List Tool Providers',
  key: 'list_tool_providers',
  description: `List available tool providers in Stack AI for interacting with external services such as web search, databases, and third-party APIs.`,
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
    let client = createClient(ctx);

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
  description: `Execute a specific action from a tool provider. Depending on the action, this can search, create, change, or delete data in an external system. Obtain the action ID and expected input schema from your Stack AI action configuration.`,
  instructions: [
    'Use List Tool Providers to discover provider IDs; obtain the action ID from your Stack AI configuration.',
    "The inputs object must match the action's expected input schema."
  ],
  tags: {
    destructive: true,
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
    let client = createClient(ctx);

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
