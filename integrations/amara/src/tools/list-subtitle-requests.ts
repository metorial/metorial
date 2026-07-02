import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubtitleRequests = SlateTool.create(spec, {
  name: 'List Subtitle Requests',
  key: 'list_subtitle_requests',
  description: `List subtitle requests for a collaboration team. Filter by work status, video, language, project, or assignee. Requests represent subtitle work items tracking through subtitling, review, approval, and completion stages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      workStatus: z
        .string()
        .optional()
        .describe(
          'Filter by work status (e.g. "needs-subtitler", "being-subtitled", "needs-reviewer", "complete")'
        ),
      videoId: z.string().optional().describe('Filter by video ID'),
      videoTitle: z.string().optional().describe('Filter by video title'),
      languageCode: z.string().optional().describe('Filter by language code'),
      projectSlug: z.string().optional().describe('Filter by project slug'),
      assignee: z.string().optional().describe('Filter by assignee username'),
      sort: z
        .string()
        .optional()
        .describe('Sort order (-creation, creation, -due, due, -completion, completion)'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of subtitle requests'),
      requests: z.array(
        z.object({
          jobId: z.string().describe('Subtitle request job ID'),
          videoId: z.string().describe('Video ID'),
          languageCode: z.string().describe('Language code'),
          workStatus: z.string().describe('Current work status'),
          subtitler: z.string().nullable().describe('Assigned subtitler username'),
          reviewer: z.string().nullable().describe('Assigned reviewer username'),
          approver: z.string().nullable().describe('Assigned approver username'),
          created: z.string().describe('Creation date'),
          workCompleted: z.string().nullable().describe('Completion date')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.listSubtitleRequests(ctx.input.teamSlug, {
      workStatus: ctx.input.workStatus,
      video: ctx.input.videoId,
      videoTitle: ctx.input.videoTitle,
      language: ctx.input.languageCode,
      project: ctx.input.projectSlug,
      assignee: ctx.input.assignee,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let requests = result.objects.map(r => ({
      jobId: r.job_id,
      videoId: r.video,
      languageCode: r.language,
      workStatus: r.work_status,
      subtitler: r.subtitler?.username ?? null,
      reviewer: r.reviewer?.username ?? null,
      approver: r.approver?.username ?? null,
      created: r.created,
      workCompleted: r.work_completed
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        requests
      },
      message: `Found **${result.meta.total_count}** subtitle request(s) for team \`${ctx.input.teamSlug}\`.`
    };
  })
  .build();
