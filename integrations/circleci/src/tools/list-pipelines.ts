import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List recent pipelines for a project. Optionally filter by branch. Returns pipeline IDs, statuses, and trigger information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Project slug in the format vcs-slug/org-name/repo-name'),
      branch: z.string().optional().describe('Filter pipelines by branch name'),
      pageToken: z.string().optional().describe('Pagination token for fetching the next page')
    })
  )
  .output(
    z.object({
      pipelines: z.array(
        z.object({
          pipelineId: z.string(),
          pipelineNumber: z.number(),
          state: z.string(),
          createdAt: z.string(),
          triggerType: z.string().optional(),
          branch: z.string().optional(),
          tag: z.string().optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getProjectPipelines(ctx.input.projectSlug, {
      branch: ctx.input.branch,
      pageToken: ctx.input.pageToken
    });

    let pipelines = (result.items || []).map((p: any) => ({
      pipelineId: p.id,
      pipelineNumber: p.number,
      state: p.state,
      createdAt: p.created_at,
      triggerType: p.trigger?.type,
      branch: p.vcs?.branch,
      tag: p.vcs?.tag
    }));

    return {
      output: {
        pipelines,
        nextPageToken: result.next_page_token
      },
      message: `Found **${pipelines.length}** pipeline(s) for project \`${ctx.input.projectSlug}\`.`
    };
  })
  .build();
