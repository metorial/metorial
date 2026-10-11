import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

// Roboflow returns job creation times as Firestore timestamps ({ _seconds, _nanoseconds }).
const createdSeconds = (value: unknown) => {
  const seconds =
    typeof value === 'object' && value !== null
      ? Number((value as { _seconds?: unknown })._seconds)
      : typeof value === 'number'
        ? value
        : Number.NaN;
  return Number.isFinite(seconds) ? seconds : undefined;
};

const mapJob = (job: any, fallbackId?: string) => ({
  jobId: job.id || fallbackId,
  name: job.name,
  status: job.status,
  labelerEmail: job.labeler,
  reviewerEmail: job.reviewer,
  totalImages: job.numImages,
  annotated: job.annotated,
  unannotated: job.unannotated,
  approved: job.approved,
  rejected: job.rejected,
  sourceBatch: job.sourceBatch,
  createdAt: createdSeconds(job.created)
});

export let listAnnotationJobsTool = SlateTool.create(spec, {
  name: 'List Annotation Jobs',
  key: 'list_annotation_jobs',
  description: `List all annotation jobs for a project. Returns each job's status, image counts, and progress towards completion. Optionally retrieve detailed information for a specific job by providing a jobId.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      jobId: z.string().optional().describe('Specific job ID to get detailed information for')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Unique job identifier'),
            name: z.string().optional().describe('Job name'),
            status: z.string().optional().describe('Job status (e.g., assigned, completed)'),
            labelerEmail: z.string().optional().describe('Email of the assigned labeler'),
            reviewerEmail: z.string().optional().describe('Email of the assigned reviewer'),
            totalImages: z.number().optional().describe('Total images assigned to the job'),
            annotated: z.number().optional().describe('Number of annotated images'),
            unannotated: z.number().optional().describe('Number of unannotated images'),
            approved: z.number().optional().describe('Number of approved annotations'),
            rejected: z.number().optional().describe('Number of rejected annotations'),
            sourceBatch: z
              .string()
              .optional()
              .describe('Source batch reference in the form projectKey/batchId'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the job was created')
          })
        )
        .describe('List of annotation jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    if (ctx.input.jobId) {
      let data = await client.getJob(workspaceId, ctx.input.projectId, ctx.input.jobId);
      let job = data.job || data;
      return {
        output: {
          jobs: [mapJob(job, ctx.input.jobId)]
        },
        message: `Job **${ctx.input.jobId}** is **${job.status || 'unknown'}** with **${job.annotated || 0}** annotated out of **${job.numImages || 0}** images.`
      };
    }

    let data = await client.listJobs(workspaceId, ctx.input.projectId);
    let jobs = (data.jobs || []).map((j: any) => mapJob(j));

    return {
      output: { jobs },
      message: `Found **${jobs.length}** annotation job(s) for project **${ctx.input.projectId}**.`
    };
  })
  .build();
