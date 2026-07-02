import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List email workflows in Salesflare. Returns workflow names, statuses, analytics, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search workflows by name'),
      limit: z.number().optional().default(20).describe('Max results to return'),
      offset: z.number().optional().default(0).describe('Pagination offset')
    })
  )
  .output(
    z.object({
      workflows: z.array(z.record(z.string(), z.any())).describe('List of workflow objects'),
      count: z.number().describe('Number of workflows returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };
    if (ctx.input.search) params.search = ctx.input.search;

    let workflows = await client.listWorkflows(params);
    let list = Array.isArray(workflows) ? workflows : [];

    return {
      output: {
        workflows: list,
        count: list.length
      },
      message: `Found **${list.length}** workflow(s).`
    };
  })
  .build();

export let getWorkflow = SlateTool.create(spec, {
  name: 'Get Workflow',
  key: 'get_workflow',
  description: `Retrieve detailed information about a specific email workflow, including its steps, filters, schedule, and analytics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.number().describe('ID of the workflow to retrieve')
    })
  )
  .output(
    z.object({
      workflow: z.record(z.string(), z.any()).describe('Full workflow details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let workflow = await client.getWorkflow(ctx.input.workflowId);

    return {
      output: { workflow },
      message: `Retrieved workflow **${workflow.name || workflow.id}**.`
    };
  })
  .build();
