import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { idStatusOutputShape } from './shared';

export let getAgentStatusTool = SlateTool.create(spec, {
  name: 'Get Agent Status',
  key: 'get_agent_status',
  description: `Check a Firecrawl agent job and retrieve gathered data when complete.`,
  instructions: ['Provide the agentId returned by Run Agent.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('The ID of the agent job to check')
    })
  )
  .output(
    z.object({
      ...idStatusOutputShape,
      extractedData: z
        .any()
        .optional()
        .describe('Data gathered by the agent, available when completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAgentStatus(ctx.input.agentId);

    return {
      output: {
        status: result.status,
        success: result.success,
        extractedData: result.data,
        expiresAt: result.expiresAt,
        creditsUsed: result.creditsUsed
      },
      message: `Agent job \`${ctx.input.agentId}\` is **${result.status}**.`
    };
  });
