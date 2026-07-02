import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runFlow = SlateTool.create(spec, {
  name: 'Run Flow',
  key: 'run_flow',
  description: `Execute a deployed Stack AI workflow and retrieve its output. Send inputs to a published flow and receive the AI-generated results.
Supports text inputs, URLs, and conversation tracking via user IDs. You can target a specific flow version or use the latest published version.`,
  instructions: [
    'The flowId can be found in the Stack AI dashboard URL or export settings.',
    'Input keys (e.g., "in-0", "url-0") depend on your flow\'s input node configuration.',
    'Use userId to maintain conversation context across multiple runs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      flowId: z.string().describe('The ID of the deployed flow to execute'),
      inputs: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs matching your flow\'s input node IDs (e.g., {"in-0": "Hello", "url-0": "https://example.com"})'
        ),
      userId: z
        .string()
        .optional()
        .describe(
          'User ID for conversation context tracking. Combine with a conversation handle as "userId-conversationId" to maintain separate threads'
        ),
      version: z
        .number()
        .optional()
        .describe('Flow version to run. Defaults to -1 (latest published version)'),
      verbose: z
        .boolean()
        .optional()
        .describe('Whether to return verbose output including intermediate node results')
    })
  )
  .output(
    z.object({
      outputs: z
        .record(z.string(), z.unknown())
        .describe('The flow execution results keyed by output node IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.runFlow(ctx.input.flowId, ctx.input.inputs, {
      userId: ctx.input.userId,
      version: ctx.input.version,
      verbose: ctx.input.verbose
    });

    return {
      output: {
        outputs: result
      },
      message: `Successfully executed flow **${ctx.input.flowId}**. Received ${Object.keys(result).length} output(s).`
    };
  })
  .build();
