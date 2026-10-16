import { createApiServiceError, SlateTool } from 'slates';
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
    'To assign/unassign: set subtitler, reviewer, or approver to a username or null.',
    'For updates, use workStage to move between subtitling, review, approval, and completion; due dates accept ISO 8601 strings. workStatus is retained for the legacy complete transition.'
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
      workStatus: z
        .string()
        .optional()
        .describe('Legacy completion update; use workStage for new workflows'),
      workStage: z
        .enum(['subtitles', 'review', 'approval', 'complete'])
        .optional()
        .describe('Workflow stage to set when updating an existing request'),
      dueDate: z
        .string()
        .optional()
        .describe('Overall request due date (ISO 8601; update only)'),
      subtitlesDueDate: z
        .string()
        .optional()
        .describe('Subtitling assignment due date (ISO 8601; update only)'),
      reviewDueDate: z
        .string()
        .optional()
        .describe('Review assignment due date (ISO 8601; update only)'),
      approvalDueDate: z
        .string()
        .optional()
        .describe('Approval assignment due date (ISO 8601; update only)')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Subtitle request job ID'),
      videoId: z.string().optional().describe('Video ID'),
      languageCode: z.string().optional().describe('Language code'),
      workStatus: z.string().optional().describe('Current work status'),
      subtitlerId: z.string().optional().describe('Stable ID of the assigned subtitler'),
      subtitler: z.string().nullable().optional().describe('Assigned subtitler'),
      reviewerId: z.string().optional().describe('Stable ID of the assigned reviewer'),
      reviewer: z.string().nullable().optional().describe('Assigned reviewer'),
      approverId: z.string().optional().describe('Stable ID of the assigned approver'),
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

    if (ctx.input.workStage !== undefined && ctx.input.workStatus !== undefined) {
      throw createApiServiceError(
        'Provide either workStage or the legacy workStatus, not both.'
      );
    }
    if (
      !ctx.input.jobId &&
      [
        ctx.input.workStage,
        ctx.input.dueDate,
        ctx.input.subtitlesDueDate,
        ctx.input.reviewDueDate,
        ctx.input.approvalDueDate
      ].some(value => value !== undefined)
    ) {
      throw createApiServiceError(
        'jobId is required when setting request workflow stages or due dates.'
      );
    }
    if (ctx.input.remove && !ctx.input.jobId) {
      throw createApiServiceError('jobId is required when deleting a subtitle request.');
    }
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
        workStatus: ctx.input.workStatus,
        workStage: ctx.input.workStage,
        dueDate: ctx.input.dueDate,
        subtitlesDueDate: ctx.input.subtitlesDueDate,
        reviewDueDate: ctx.input.reviewDueDate,
        approvalDueDate: ctx.input.approvalDueDate
      });

      return {
        output: {
          jobId: req.job_id,
          videoId: req.video,
          languageCode: req.language,
          workStatus: req.work_status,
          subtitler: req.subtitler?.username ?? null,
          subtitlerId: req.subtitler?.id,
          reviewer: req.reviewer?.username ?? null,
          reviewerId: req.reviewer?.id,
          approver: req.approver?.username ?? null,
          approverId: req.approver?.id,
          created: req.created,
          removed: false
        },
        message: `Updated subtitle request \`${req.job_id}\` — status: **${req.work_status}**.`
      };
    }

    if (!ctx.input.videoId || !ctx.input.languageCode) {
      throw createApiServiceError(
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
        subtitlerId: req.subtitler?.id,
        reviewer: req.reviewer?.username ?? null,
        reviewerId: req.reviewer?.id,
        approver: req.approver?.username ?? null,
        approverId: req.approver?.id,
        created: req.created,
        removed: false
      },
      message: `Created subtitle request \`${req.job_id}\` for **${req.language}** on video \`${req.video}\`.`
    };
  })
  .build();
