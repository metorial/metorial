import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubtitleRequest = SlateTool.create(spec, {
  name: 'Manage Subtitle Request',
  key: 'manage_subtitle_request',
  description: `Create, update, or delete subtitle requests for collaboration teams. Requests track subtitle work through a multi-stage workflow: subtitling, review, approval, and completion. Assignees and status can be managed.`,
  instructions: [
    'To create: provide teamSlug, videoId, and languageCode.',
    'To update: provide teamSlug and jobId along with fields to change.',
    'To delete: provide teamSlug, jobId, and set "remove" to true.',
    'To assign/unassign: set subtitler, reviewer, or approver to a username or null.'
  ]
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      jobId: z.string().optional().describe('Subtitle request job ID (for update/delete)'),
      remove: z.boolean().optional().describe('Set to true to delete the request'),
      videoId: z.string().optional().describe('Video ID (required for creation)'),
      languageCode: z.string().optional().describe('Language code (required for creation)'),
      subtitler: z
        .string()
        .nullable()
        .optional()
        .describe('Subtitler username (null to unassign)'),
      reviewer: z
        .string()
        .nullable()
        .optional()
        .describe('Reviewer username (null to unassign)'),
      approver: z
        .string()
        .nullable()
        .optional()
        .describe('Approver username (null to unassign)'),
      workStatus: z.string().optional().describe('Set work status (e.g. "complete")')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Subtitle request job ID'),
      videoId: z.string().optional().describe('Video ID'),
      languageCode: z.string().optional().describe('Language code'),
      workStatus: z.string().optional().describe('Current work status'),
      subtitler: z.string().nullable().optional().describe('Assigned subtitler'),
      reviewer: z.string().nullable().optional().describe('Assigned reviewer'),
      approver: z.string().nullable().optional().describe('Assigned approver'),
      created: z.string().optional().describe('Creation date'),
      removed: z.boolean().describe('Whether the request was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (ctx.input.remove && ctx.input.jobId) {
      await client.deleteSubtitleRequest(ctx.input.teamSlug, ctx.input.jobId);
      return {
        output: { removed: true },
        message: `Deleted subtitle request \`${ctx.input.jobId}\` from team \`${ctx.input.teamSlug}\`.`
      };
    }

    if (ctx.input.jobId) {
      let req = await client.updateSubtitleRequest(ctx.input.teamSlug, ctx.input.jobId, {
        subtitler: ctx.input.subtitler,
        reviewer: ctx.input.reviewer,
        approver: ctx.input.approver,
        workStatus: ctx.input.workStatus
      });

      return {
        output: {
          jobId: req.job_id,
          videoId: req.video,
          languageCode: req.language,
          workStatus: req.work_status,
          subtitler: req.subtitler?.username ?? null,
          reviewer: req.reviewer?.username ?? null,
          approver: req.approver?.username ?? null,
          created: req.created,
          removed: false
        },
        message: `Updated subtitle request \`${req.job_id}\` — status: **${req.work_status}**.`
      };
    }

    if (!ctx.input.videoId || !ctx.input.languageCode) {
      throw new Error(
        'videoId and languageCode are required when creating a subtitle request'
      );
    }

    let req = await client.createSubtitleRequest(ctx.input.teamSlug, {
      video: ctx.input.videoId,
      language: ctx.input.languageCode
    });

    return {
      output: {
        jobId: req.job_id,
        videoId: req.video,
        languageCode: req.language,
        workStatus: req.work_status,
        subtitler: req.subtitler?.username ?? null,
        reviewer: req.reviewer?.username ?? null,
        approver: req.approver?.username ?? null,
        created: req.created,
        removed: false
      },
      message: `Created subtitle request \`${req.job_id}\` for **${req.language}** on video \`${req.video}\`.`
    };
  })
  .build();
