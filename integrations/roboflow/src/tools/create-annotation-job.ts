import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createAnnotationJobTool = SlateTool.create(spec, {
  name: 'Create Annotation Job',
  key: 'create_annotation_job',
  description: `Create a new annotation job for a project. An annotation job assigns images from a batch to a labeler for annotation and a reviewer for quality control. Both must be members of the workspace.`
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      name: z.string().describe('Name for the annotation job'),
      batchId: z.string().describe('Batch ID or name containing the images to annotate'),
      labelerEmail: z.string().describe('Email of the workspace member who will label images'),
      reviewerEmail: z
        .string()
        .describe('Email of the workspace member who will review labels'),
      numImages: z.number().optional().describe('Number of images to include from the batch')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Unique identifier of the created job'),
      success: z.boolean().describe('Whether the job was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    let result = await client.createJob(workspaceId, ctx.input.projectId, {
      name: ctx.input.name,
      batch: ctx.input.batchId,
      labelerEmail: ctx.input.labelerEmail,
      reviewerEmail: ctx.input.reviewerEmail,
      numImages: ctx.input.numImages
    });

    return {
      output: {
        jobId: result.id || result.job?.id,
        success: true
      },
      message: `Created annotation job **${ctx.input.name}** with labeler **${ctx.input.labelerEmail}** and reviewer **${ctx.input.reviewerEmail}**.`
    };
  })
  .build();
