import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workflowSchema = z.object({
  workflowId: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.string(),
  stoppedAt: z.string().optional()
});

export let getPipeline = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description: `Retrieve details about a specific pipeline by ID, including its workflows and their statuses. Provides a comprehensive view of the pipeline's current state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('The UUID of the pipeline to retrieve')
    })
  )
  .output(
    z.object({
      pipelineId: z.string(),
      pipelineNumber: z.number(),
      state: z.string(),
      createdAt: z.string(),
      trigger: z
        .object({
          type: z.string(),
          receivedAt: z.string().optional()
        })
        .optional(),
      vcs: z
        .object({
          providerName: z.string().optional(),
          branch: z.string().optional(),
          tag: z.string().optional(),
          revision: z.string().optional(),
          originRepositoryUrl: z.string().optional()
        })
        .optional(),
      workflows: z.array(workflowSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let pipeline = await client.getPipeline(ctx.input.pipelineId);
    let workflowsResponse = await client.getPipelineWorkflows(ctx.input.pipelineId);

    let workflows = (workflowsResponse.items || []).map((w: any) => ({
      workflowId: w.id,
      name: w.name,
      status: w.status,
      createdAt: w.created_at,
      stoppedAt: w.stopped_at
    }));

    let vcs = pipeline.vcs
      ? {
          providerName: pipeline.vcs.provider_name,
          branch: pipeline.vcs.branch,
          tag: pipeline.vcs.tag,
          revision: pipeline.vcs.revision,
          originRepositoryUrl: pipeline.vcs.origin_repository_url
        }
      : undefined;

    return {
      output: {
        pipelineId: pipeline.id,
        pipelineNumber: pipeline.number,
        state: pipeline.state,
        createdAt: pipeline.created_at,
        trigger: pipeline.trigger
          ? {
              type: pipeline.trigger.type,
              receivedAt: pipeline.trigger.received_at
            }
          : undefined,
        vcs,
        workflows
      },
      message: `Pipeline **#${pipeline.number}** is in state **${pipeline.state}** with ${workflows.length} workflow(s).`
    };
  })
  .build();
