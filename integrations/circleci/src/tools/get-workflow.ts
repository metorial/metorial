import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkflow = SlateTool.create(spec, {
  name: 'Get Workflow',
  key: 'get_workflow',
  description: `Retrieve details about a workflow including its status, timing, and all its jobs. Provides a comprehensive view of a workflow's execution.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('The UUID of the workflow to retrieve')
    })
  )
  .output(
    z.object({
      workflowId: z.string(),
      name: z.string(),
      status: z.string(),
      createdAt: z.string(),
      stoppedAt: z.string().optional(),
      pipelineId: z.string(),
      pipelineNumber: z.number(),
      projectSlug: z.string(),
      jobs: z.array(
        z.object({
          jobId: z.string(),
          name: z.string(),
          type: z.string(),
          status: z.string(),
          startedAt: z.string().optional(),
          stoppedAt: z.string().optional(),
          jobNumber: z.number().optional(),
          approvalRequestId: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let workflow = await client.getWorkflow(ctx.input.workflowId);
    let jobsResponse = await client.getWorkflowJobs(ctx.input.workflowId);

    let jobs = (jobsResponse.items || []).map((j: any) => ({
      jobId: j.id,
      name: j.name,
      type: j.type,
      status: j.status,
      startedAt: j.started_at,
      stoppedAt: j.stopped_at,
      jobNumber: j.job_number,
      approvalRequestId: j.approval_request_id
    }));

    return {
      output: {
        workflowId: workflow.id,
        name: workflow.name,
        status: workflow.status,
        createdAt: workflow.created_at,
        stoppedAt: workflow.stopped_at,
        pipelineId: workflow.pipeline_id,
        pipelineNumber: workflow.pipeline_number,
        projectSlug: workflow.project_slug,
        jobs
      },
      message: `Workflow **${workflow.name}** is **${workflow.status}** with ${jobs.length} job(s).`
    };
  })
  .build();
