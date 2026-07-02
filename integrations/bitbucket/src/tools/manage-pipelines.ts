import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePipelinesTool = SlateTool.create(spec, {
  name: 'Manage Pipelines',
  key: 'manage_pipelines',
  description: `List, get, trigger, or stop Bitbucket Pipelines.
- **list**: View recent pipelines and their statuses.
- **get**: Get details of a specific pipeline including steps.
- **trigger**: Start a new pipeline on a branch, tag, or custom pattern.
- **stop**: Stop a running pipeline.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      action: z.enum(['list', 'get', 'trigger', 'stop']).describe('Action to perform'),
      pipelineUuid: z.string().optional().describe('Pipeline UUID (required for get/stop)'),
      branch: z
        .string()
        .optional()
        .describe('Branch to trigger pipeline on (for trigger action)'),
      tag: z.string().optional().describe('Tag to trigger pipeline on (for trigger action)'),
      customPattern: z
        .string()
        .optional()
        .describe('Custom pipeline pattern name (for trigger action)'),
      variables: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
            secured: z.boolean().optional()
          })
        )
        .optional()
        .describe('Pipeline variables to set when triggering'),
      sort: z.string().optional().describe('Sort field for listing (e.g. "-created_on")'),
      page: z.number().optional().describe('Page number for listing'),
      pageLen: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineUuid: z.string(),
            buildNumber: z.number().optional(),
            state: z.string().optional(),
            result: z.string().optional(),
            branch: z.string().optional(),
            createdOn: z.string().optional(),
            completedOn: z.string().optional(),
            durationInSeconds: z.number().optional(),
            htmlUrl: z.string().optional()
          })
        )
        .optional(),
      pipeline: z
        .object({
          pipelineUuid: z.string(),
          buildNumber: z.number().optional(),
          state: z.string().optional(),
          result: z.string().optional(),
          branch: z.string().optional(),
          createdOn: z.string().optional(),
          completedOn: z.string().optional(),
          htmlUrl: z.string().optional(),
          steps: z
            .array(
              z.object({
                stepUuid: z.string(),
                name: z.string().optional(),
                state: z.string().optional(),
                result: z.string().optional(),
                durationInSeconds: z.number().optional()
              })
            )
            .optional()
        })
        .optional(),
      stopped: z.boolean().optional(),
      hasNextPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    if (ctx.input.action === 'list') {
      let result = await client.listPipelines(ctx.input.repoSlug, {
        sort: ctx.input.sort,
        page: ctx.input.page,
        pageLen: ctx.input.pageLen
      });

      let pipelines = (result.values || []).map((p: any) => ({
        pipelineUuid: p.uuid,
        buildNumber: p.build_number,
        state: p.state?.name || undefined,
        result: p.state?.result?.name || undefined,
        branch: p.target?.ref_name || undefined,
        createdOn: p.created_on,
        completedOn: p.completed_on || undefined,
        durationInSeconds: p.duration_in_seconds || undefined,
        htmlUrl: p.links?.html?.href || undefined
      }));

      return {
        output: { pipelines, hasNextPage: !!result.next },
        message: `Found **${pipelines.length}** pipelines.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.pipelineUuid) {
        throw bitbucketServiceError('pipelineUuid is required for get action');
      }

      let p = await client.getPipeline(ctx.input.repoSlug, ctx.input.pipelineUuid);

      let stepsResult = await client.listPipelineSteps(
        ctx.input.repoSlug,
        ctx.input.pipelineUuid
      );
      let steps = (stepsResult.values || []).map((s: any) => ({
        stepUuid: s.uuid,
        name: s.name || undefined,
        state: s.state?.name || undefined,
        result: s.state?.result?.name || undefined,
        durationInSeconds: s.duration_in_seconds || undefined
      }));

      return {
        output: {
          pipeline: {
            pipelineUuid: p.uuid,
            buildNumber: p.build_number,
            state: p.state?.name || undefined,
            result: p.state?.result?.name || undefined,
            branch: p.target?.ref_name || undefined,
            createdOn: p.created_on,
            completedOn: p.completed_on || undefined,
            htmlUrl: p.links?.html?.href || undefined,
            steps
          }
        },
        message: `Pipeline **#${p.build_number}** — state: **${p.state?.name}**, ${steps.length} steps.`
      };
    }

    if (ctx.input.action === 'trigger') {
      let target: Record<string, any> = {};

      if (ctx.input.customPattern) {
        target.type = 'pipeline_ref_target';
        target.ref_type = 'branch';
        target.ref_name = ctx.input.branch || 'main';
        target.selector = { type: 'custom', pattern: ctx.input.customPattern };
      } else if (ctx.input.tag) {
        target.type = 'pipeline_ref_target';
        target.ref_type = 'tag';
        target.ref_name = ctx.input.tag;
      } else {
        target.type = 'pipeline_ref_target';
        target.ref_type = 'branch';
        target.ref_name = ctx.input.branch || 'main';
      }

      let body: Record<string, any> = { target };

      if (ctx.input.variables?.length) {
        body.variables = ctx.input.variables.map(v => ({
          key: v.key,
          value: v.value,
          secured: v.secured || false
        }));
      }

      let p = await client.triggerPipeline(ctx.input.repoSlug, body);

      return {
        output: {
          pipeline: {
            pipelineUuid: p.uuid,
            buildNumber: p.build_number,
            state: p.state?.name || undefined,
            result: undefined,
            branch: p.target?.ref_name || undefined,
            createdOn: p.created_on,
            completedOn: undefined,
            htmlUrl: p.links?.html?.href || undefined
          }
        },
        message: `Triggered pipeline **#${p.build_number}**.`
      };
    }

    // stop
    if (!ctx.input.pipelineUuid) {
      throw bitbucketServiceError('pipelineUuid is required for stop action');
    }

    await client.stopPipeline(ctx.input.repoSlug, ctx.input.pipelineUuid);

    return {
      output: { stopped: true },
      message: `Stopped pipeline **${ctx.input.pipelineUuid}**.`
    };
  })
  .build();
