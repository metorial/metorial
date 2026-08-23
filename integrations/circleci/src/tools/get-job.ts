import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { circleCiValidationError } from '../lib/validation';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve details about a specific job by its number, including status, timing, executor info, and optionally its artifacts and test metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Project slug in the format vcs-slug/org-name/repo-name'),
      jobNumber: z.number().describe('The job number within the project'),
      includeArtifacts: z
        .boolean()
        .optional()
        .describe('Whether to include artifacts in the response'),
      includeTests: z
        .boolean()
        .optional()
        .describe('Whether to include test metadata in the response'),
      artifactsPageToken: z
        .string()
        .optional()
        .describe('Pagination token for the artifact page'),
      testsPageToken: z
        .string()
        .optional()
        .describe('Pagination token for the test-result page')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional(),
      jobNumber: z.number(),
      name: z.string().optional(),
      status: z.string(),
      startedAt: z.string().optional(),
      stoppedAt: z.string().optional(),
      duration: z.number().optional().describe('Job duration in milliseconds'),
      executor: z
        .object({
          type: z.string().optional(),
          resourceClass: z.string().optional()
        })
        .optional(),
      parallelism: z.number().optional(),
      webUrl: z.string().optional(),
      artifacts: z
        .array(
          z.object({
            path: z.string(),
            nodeIndex: z.number().optional(),
            url: z.string()
          })
        )
        .optional(),
      artifactsNextPageToken: z.string().nullable().optional(),
      tests: z
        .object({
          items: z.array(
            z.object({
              name: z.string().optional(),
              classname: z.string().optional(),
              result: z.string().optional(),
              runTime: z.number().optional(),
              message: z.string().optional(),
              source: z.string().optional(),
              file: z.string().optional()
            })
          ),
          totalCount: z.number().optional()
        })
        .optional(),
      testsNextPageToken: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.artifactsPageToken && !ctx.input.includeArtifacts) {
      throw circleCiValidationError(
        'includeArtifacts must be enabled when artifactsPageToken is provided.'
      );
    }
    if (ctx.input.testsPageToken && !ctx.input.includeTests) {
      throw circleCiValidationError(
        'includeTests must be enabled when testsPageToken is provided.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    let job = await client.getJobDetails(ctx.input.projectSlug, ctx.input.jobNumber);
    let jobNumber = job.number ?? job.job_number;

    let artifacts: { path: string; nodeIndex?: number; url: string }[] | undefined;
    let artifactsNextPageToken: string | null | undefined;
    if (ctx.input.includeArtifacts) {
      let artifactsResponse = await client.getJobArtifacts(
        ctx.input.projectSlug,
        ctx.input.jobNumber,
        ctx.input.artifactsPageToken
      );
      artifacts = (artifactsResponse.items || []).map((a: any) => ({
        path: a.path,
        nodeIndex: a.node_index,
        url: a.url
      }));
      artifactsNextPageToken = artifactsResponse.next_page_token;
    }

    let tests:
      | {
          items: {
            name?: string;
            classname?: string;
            result?: string;
            runTime?: number;
            message?: string;
            source?: string;
            file?: string;
          }[];
          totalCount?: number;
        }
      | undefined;
    let testsNextPageToken: string | null | undefined;
    if (ctx.input.includeTests) {
      let testsResponse = await client.getJobTestMetadata(
        ctx.input.projectSlug,
        ctx.input.jobNumber,
        ctx.input.testsPageToken
      );
      tests = {
        items: (testsResponse.items || []).map((t: any) => ({
          name: t.name,
          classname: t.classname,
          result: t.result,
          runTime: t.run_time,
          message: t.message,
          source: t.source,
          file: t.file
        })),
        totalCount: testsResponse.items?.length
      };
      testsNextPageToken = testsResponse.next_page_token;
    }

    return {
      output: {
        jobId: job.id,
        jobNumber,
        name: job.name,
        status: job.status,
        startedAt: job.started_at,
        stoppedAt: job.stopped_at,
        duration: job.duration,
        executor: job.executor
          ? {
              type: job.executor.type,
              resourceClass: job.executor.resource_class
            }
          : undefined,
        parallelism: job.parallelism,
        webUrl: job.web_url,
        artifacts,
        artifactsNextPageToken,
        tests,
        testsNextPageToken
      },
      message: `Job **#${jobNumber}** (${job.name || 'unnamed'}) is **${job.status}**.`
    };
  })
  .build();
