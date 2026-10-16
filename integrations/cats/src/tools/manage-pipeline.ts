import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredId, validateNumber } from '../lib/response';
import { spec } from '../spec';

export let createPipeline = SlateTool.create(spec, {
  name: 'Create Pipeline',
  key: 'create_pipeline',
  description: `Add a candidate to a job order pipeline. This creates the candidate-job relationship and begins tracking the candidate's progress through the hiring workflow.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.number().describe('Candidate ID to add to the pipeline'),
      jobId: z.number().describe('Job order ID'),
      statusId: z
        .number()
        .optional()
        .describe(
          'Initial workflow status ID from list_workflow_statuses; applied after creation'
        ),
      rating: z.number().optional().describe('Rating for the candidate (0-5)')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('ID of the created pipeline entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      candidate_id: ctx.input.candidateId,
      job_id: ctx.input.jobId
    };
    validateNumber(ctx.input.statusId, 'statusId');
    if (ctx.input.rating !== undefined) body.rating = ctx.input.rating;

    let result = await client.createPipeline(body);
    let pipelineId = requiredId(result?.id, 'created record');

    if (ctx.input.statusId !== undefined) {
      try {
        await client.setPipelineStatus(pipelineId, ctx.input.statusId);
      } catch {
        throw createApiServiceError(
          `Pipeline ${pipelineId} was created, but setting its initial status failed. Inspect it with get_pipeline before retrying.`
        );
      }
    }

    return {
      output: { pipelineId },
      message: `Added candidate **${ctx.input.candidateId}** to job **${ctx.input.jobId}** pipeline (ID: ${pipelineId}).`
    };
  })
  .build();

export let getPipeline = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description: `Retrieve a pipeline entry showing a candidate's status within a job order. Returns the candidate-job relationship details, current status, and rating.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('Pipeline entry ID')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('Pipeline ID'),
      candidateId: z.string().optional().describe('Candidate ID'),
      jobId: z.string().optional().describe('Job ID'),
      rating: z.number().optional().describe('Rating (0-5)'),
      statusId: z.string().optional().describe('Current status ID'),
      workflowId: z.string().optional().describe('Workflow ID for list_workflow_statuses'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date'),
      raw: z.any().optional().describe('Complete provider response, retaining null values'),
      links: z.any().optional().describe('HAL links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getPipeline(ctx.input.pipelineId);

    return {
      output: {
        pipelineId: requiredId(data?.id, 'record'),
        candidateId: data.candidate_id?.toString(),
        jobId: data.job_id?.toString(),
        rating: data.rating ?? undefined,
        statusId: data.status_id?.toString(),
        workflowId: data.workflow_id?.toString(),
        createdAt: data.date_created ?? undefined,
        updatedAt: data.date_modified ?? undefined,
        raw: data,
        links: data._links
      },
      message: `Retrieved pipeline **${ctx.input.pipelineId}**.`
    };
  })
  .build();

export let updatePipelineStatus = SlateTool.create(spec, {
  name: 'Update Pipeline Status',
  key: 'update_pipeline_status',
  description: `Change a candidate's workflow status within a job pipeline. Optionally fire status triggers configured in CATS. Also supports updating the candidate's rating.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('Pipeline entry ID'),
      statusId: z
        .number()
        .optional()
        .describe('New workflow status ID from list_workflow_statuses'),
      fireTriggers: z
        .boolean()
        .optional()
        .describe('Whether to fire each attached status trigger; omit to use CATS defaults'),
      rating: z.number().optional().describe('Updated rating (0-5)')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('Pipeline ID'),
      updated: z.boolean().describe('Whether update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    validateNumber(ctx.input.statusId, 'statusId');
    validateNumber(ctx.input.rating, 'rating', 0, 5);
    if (ctx.input.rating === undefined && ctx.input.statusId === undefined) {
      throw createApiServiceError('Provide statusId or rating to update the pipeline.');
    }
    if (ctx.input.fireTriggers !== undefined && ctx.input.statusId === undefined) {
      throw createApiServiceError('fireTriggers requires statusId.');
    }
    if (ctx.input.statusId !== undefined) {
      await client.setPipelineStatus(
        ctx.input.pipelineId,
        ctx.input.statusId,
        ctx.input.fireTriggers
      );
    }
    if (ctx.input.rating !== undefined) {
      await client.updatePipeline(ctx.input.pipelineId, { rating: ctx.input.rating });
    }

    return {
      output: {
        pipelineId: ctx.input.pipelineId,
        updated: true
      },
      message: `Updated pipeline **${ctx.input.pipelineId}** status.`
    };
  })
  .build();

export let deletePipeline = SlateTool.create(spec, {
  name: 'Delete Pipeline',
  key: 'delete_pipeline',
  description: `Remove a candidate from a job order pipeline.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('Pipeline entry ID to delete')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('Deleted pipeline ID'),
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deletePipeline(ctx.input.pipelineId);

    return {
      output: {
        pipelineId: ctx.input.pipelineId,
        deleted: true
      },
      message: `Removed pipeline entry **${ctx.input.pipelineId}**.`
    };
  })
  .build();
