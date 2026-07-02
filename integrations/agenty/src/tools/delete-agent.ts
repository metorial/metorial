import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAgent = SlateTool.create(spec, {
  name: 'Delete Agent',
  key: 'delete_agent',
  description: `Permanently delete a scraping, crawling, or monitoring agent by its ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('The unique identifier of the agent to delete.')
    })
  )
  .output(
    z.object({
      statusCode: z.number().describe('HTTP status code of the response.'),
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteAgent(ctx.input.agentId);

    return {
      output: {
        statusCode: result.status_code || 200,
        message: result.message || 'Agent deleted successfully.'
      },
      message: `Deleted agent **${ctx.input.agentId}**.`
    };
  })
  .build();
