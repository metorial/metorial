import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkflowData = SlateTool.create(spec, {
  name: 'Get Workflow Data',
  key: 'get_workflow_data',
  description: `Retrieve all extracted and scraped data for a specific Hystruct workflow. Returns the structured data collected by the AI scraping engine, shaped according to the workflow's defined schema. Use this to access scraped results such as e-commerce listings, job postings, real estate data, or any other structured content.`,
  constraints: ['Rate limit: 100 requests per minute.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('The ID of the workflow to retrieve data from.')
    })
  )
  .output(
    z.object({
      items: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Array of extracted data items, each shaped according to the workflow schema.'
        ),
      count: z.number().describe('Total number of items returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getWorkflowData(ctx.input.workflowId);

    return {
      output: {
        items: data as Record<string, unknown>[],
        count: data.length
      },
      message: `Retrieved **${data.length}** item(s) from workflow \`${ctx.input.workflowId}\`.`
    };
  })
  .build();
