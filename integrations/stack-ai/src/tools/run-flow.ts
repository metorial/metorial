import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { deploymentUrlInput, orgIdInput, parseDeploymentUrl } from '../lib/deployment';
import { spec } from '../spec';

export let runFlow = SlateTool.create(spec, {
  name: 'Run Flow',
  key: 'run_flow',
  description: `Execute a deployed Stack AI workflow and retrieve its output. Send inputs to a published flow and receive the AI-generated results.
Supports text inputs, URLs, and conversation tracking via user IDs. You can target a specific flow version or use the latest published version.`,
  instructions: [
    'Copy the workflow API URL from Export View > API, or call get_organization_analytics to discover flow IDs.',
    'Input keys (e.g., "in-0", "url-0") depend on your flow\'s input node configuration.',
    'Use userId to maintain conversation context across multiple runs.',
    'Workflow execution can send messages, change external data, or incur usage charges; confirm the configured workflow behavior and destination before running it.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      flowId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Deployed flow ID from get_organization_analytics or Export View > API. Omit when a deployment URL identifies the flow.'
        ),
      orgId: orgIdInput,
      deploymentUrl: deploymentUrlInput,
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
        .multipleOf(1)
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
    const deployment = ctx.input.deploymentUrl
      ? parseDeploymentUrl(ctx.input.deploymentUrl)
      : undefined;
    if (
      deployment &&
      ((ctx.input.flowId && ctx.input.flowId !== deployment.flowId) ||
        (ctx.input.orgId && ctx.input.orgId !== deployment.orgId))
    ) {
      throw createApiServiceError(
        'flowId and orgId must match the supplied deploymentUrl. Provide the API URL alone or matching identifiers.'
      );
    }
    const flowId = ctx.input.flowId ?? deployment?.flowId ?? ctx.auth.flowId;
    if (!flowId)
      throw createApiServiceError(
        'Provide the deployed workflow API URL or flowId from Export View > API.'
      );
    if (
      ctx.input.userId &&
      ctx.input.inputs.user_id !== undefined &&
      ctx.input.inputs.user_id !== ctx.input.userId
    ) {
      throw createApiServiceError(
        'userId must match inputs.user_id when both are supplied. Provide the user ID once or use matching values.'
      );
    }
    let client = createClient(
      ctx,
      ctx.input.orgId ?? deployment?.orgId,
      deployment?.inferenceBaseUrl
    );

    let result = await client.runFlow(flowId, ctx.input.inputs, {
      userId: ctx.input.userId,
      version: ctx.input.version,
      verbose: ctx.input.verbose
    });

    return {
      output: {
        outputs: result
      },
      message: `Successfully executed flow **${flowId}**. Received ${Object.keys(result).length} result field(s).`
    };
  })
  .build();
