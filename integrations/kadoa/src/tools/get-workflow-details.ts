import { SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkflowDetails = SlateTool.create(spec, {
  name: 'Get Workflow Details',
  key: 'get_workflow_details',
  description: `Retrieve comprehensive details of a Kadoa workflow including its configuration, schema, run history, health status, and monitoring settings.
Use this to inspect a workflow's full setup before running or modifying it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow'),
      includeHistory: z.boolean().optional().describe('Also retrieve run history')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Workflow ID'),
      name: z.string().optional().describe('Workflow name'),
      description: z.string().optional().describe('Workflow description'),
      state: z.string().optional().describe('Workflow state'),
      displayState: z.string().optional().describe('Human-readable state'),
      url: z.string().optional().describe('Primary target URL'),
      urls: z.array(z.string()).optional().describe('All target URLs'),
      totalRecords: z.number().optional().describe('Total extracted records'),
      runState: z.string().optional().describe('Latest run state'),
      tags: z.array(z.string()).optional().describe('Workflow tags'),
      navigationMode: z.string().optional().describe('Navigation mode'),
      maxDepth: z.number().optional().describe('Max crawl depth'),
      maxPages: z.number().optional().describe('Max pages to crawl'),
      monitoring: z.boolean().optional().describe('Whether monitoring is enabled'),
      schema: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            dataType: z.string().optional(),
            isKey: z.boolean().optional(),
            isRequired: z.boolean().optional()
          })
        )
        .optional()
        .describe('Data schema fields'),
      healthTier: z.string().optional().describe('Observer health tier'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      lastRunAt: z.string().optional().describe('Last finished run timestamp'),
      runs: z
        .array(
          z.object({
            runId: z.string(),
            state: z.string().optional(),
            startedAt: z.string().optional(),
            finishedAt: z.string().optional(),
            records: z.number().optional(),
            credits: z.number().optional()
          })
        )
        .optional()
        .describe('Run history (when includeHistory is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });

    let workflow = await client.getWorkflow(ctx.input.workflowId);

    let runs: any[] | undefined;
    if (ctx.input.includeHistory) {
      let history = await client.getWorkflowHistory(ctx.input.workflowId);
      runs = (history.workflowRuns || []).map((r: any) => ({
        runId: r.id,
        state: r.state,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        records: r.records,
        credits: r.credits
      }));
    }

    return {
      output: {
        workflowId: workflow.id,
        name: workflow.name,
        description: workflow.description,
        state: workflow.state,
        displayState: workflow.displayState,
        url: workflow.url,
        urls: workflow.urls,
        totalRecords: workflow.totalRecords,
        runState: workflow.runState,
        tags: workflow.tags,
        navigationMode: workflow.navigationMode,
        maxDepth: workflow.maxDepth,
        maxPages: workflow.maxPages,
        monitoring: workflow.monitoring,
        schema: workflow.schema?.map((s: any) => ({
          name: s.name,
          description: s.description,
          dataType: s.dataType,
          isKey: s.isKey,
          isRequired: s.isRequired
        })),
        healthTier: workflow.observerHealth?.healthTier,
        createdAt: workflow.createdAt,
        lastRunAt: workflow.finishedAt,
        runs
      },
      message: `Workflow **${workflow.name || workflow.id}** — state: **${workflow.state}**, ${workflow.totalRecords || 0} records.${runs ? ` ${runs.length} run(s) in history.` : ''}`
    };
  })
  .build();
