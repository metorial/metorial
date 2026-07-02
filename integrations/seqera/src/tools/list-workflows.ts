import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflow Runs',
  key: 'list_workflows',
  description: `List workflow runs (pipeline executions) in a workspace. Returns run status, duration, metadata, and basic execution details. Supports search, pagination, and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search filter for run name or project'),
      max: z.number().optional().describe('Maximum number of results (default 50)'),
      offset: z.number().optional().describe('Offset for pagination'),
      sortBy: z.string().optional().describe('Field to sort by, e.g. "start", "status"'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      workflows: z
        .array(
          z.object({
            workflowId: z.string().optional().describe('Workflow run ID'),
            runName: z.string().optional().describe('Run name'),
            status: z
              .string()
              .optional()
              .describe('Run status (e.g., SUBMITTED, RUNNING, SUCCEEDED, FAILED, CANCELLED)'),
            projectName: z.string().optional().describe('Pipeline project name'),
            repository: z.string().optional().describe('Pipeline repository URL'),
            revision: z.string().optional().describe('Pipeline revision'),
            userName: z.string().optional().describe('User who launched the run'),
            start: z.string().optional().describe('Run start time'),
            complete: z.string().optional().describe('Run completion time'),
            duration: z.number().optional().describe('Run duration in milliseconds'),
            exitStatus: z.number().optional().describe('Process exit status'),
            errorMessage: z.string().optional().describe('Error message if failed')
          })
        )
        .describe('List of workflow runs'),
      totalSize: z.number().optional().describe('Total number of workflow runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listWorkflows({
      search: ctx.input.search,
      max: ctx.input.max,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      sortDir: ctx.input.sortDirection,
      attributes: ['labels']
    });

    let workflows = result.workflows.map(w => ({
      workflowId: w.id,
      runName: w.runName,
      status: w.status,
      projectName: w.projectName,
      repository: w.repository,
      revision: w.revision,
      userName: w.userName,
      start: w.start,
      complete: w.complete,
      duration: w.duration,
      exitStatus: w.exitStatus,
      errorMessage: w.errorMessage
    }));

    return {
      output: {
        workflows,
        totalSize: result.totalSize
      },
      message: `Found **${workflows.length}** workflow runs${result.totalSize ? ` (${result.totalSize} total)` : ''}.`
    };
  })
  .build();
