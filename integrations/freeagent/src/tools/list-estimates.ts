import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listEstimates = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description: `Retrieve estimates from FreeAgent. Can filter by contact, project, or include nested line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z.string().optional().describe('Filter estimates by view'),
      updatedSince: z.string().optional().describe('ISO 8601 timestamp'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      nestedItems: z.boolean().optional().describe('Include line items in the response'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      estimates: z.array(z.record(z.string(), z.any())).describe('List of estimate records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let estimates = await client.listEstimates(ctx.input);
    let count = estimates.length;

    return {
      output: { estimates },
      message: `Found **${count}** estimate${count !== 1 ? 's' : ''}.`
    };
  })
  .build();
