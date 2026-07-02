import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workflowSchema = z.object({
  workflowId: z.string().describe('Unique identifier of the workflow'),
  name: z.string().describe('Name of the workflow'),
  description: z.string().optional().describe('Description of the workflow')
});

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List all active workflows (templates) in the organization. Optionally filter by name. Use this to discover available workflows before creating workflow runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter workflows by name')
    })
  )
  .output(
    z.object({
      workflows: z.array(workflowSchema).describe('List of workflows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listWorkflows(
      ctx.input.name ? { name: ctx.input.name } : undefined
    );
    let workflows = (data.workflows || []).map((w: any) => ({
      workflowId: w.id,
      name: w.name,
      description: w.description
    }));
    return {
      output: { workflows },
      message: `Found **${workflows.length}** workflow(s).`
    };
  })
  .build();
