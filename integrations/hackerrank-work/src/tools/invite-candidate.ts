import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInteger, validateSchedule } from '../lib/validation';
import { spec } from '../spec';

export let inviteCandidate = SlateTool.create(spec, {
  name: 'Invite Candidate',
  key: 'invite_candidate',
  description: `Invite a candidate to take a specific coding assessment test. Sends an invitation to the candidate's email with a link to the test. Optionally configure whether to send an email notification and whether to force re-invite.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the test to invite the candidate to'),
      email: z.string().describe('Email address of the candidate'),
      fullName: z.string().optional().describe('Full name of the candidate'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Whether to send an email invitation (provider default false)'),
      force: z
        .boolean()
        .optional()
        .describe('Force re-invite even if candidate was already invited'),
      forceReattempt: z
        .boolean()
        .optional()
        .describe('Allow re-invitation even after the candidate attempted the test'),
      templateId: z
        .string()
        .optional()
        .describe('Invitation email template ID; call list_invite_templates to discover IDs'),
      inviteValidFrom: z
        .string()
        .optional()
        .describe('Invitation valid-from timestamp in ISO 8601 format'),
      inviteValidTo: z
        .string()
        .optional()
        .describe('Invitation valid-until timestamp in ISO 8601 format'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom candidate invitation metadata'),
      additionalTimePercent: z
        .number()
        .optional()
        .describe('Positive integer percentage of extra test time'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to associate with the candidate invitation')
    })
  )
  .output(
    z.object({
      candidate: z.record(z.string(), z.any()).describe('Created candidate invitation object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    validateSchedule(ctx.input.inviteValidFrom, ctx.input.inviteValidTo);
    validateInteger(ctx.input.additionalTimePercent, 'additionalTimePercent', 1);
    let result = await client.inviteCandidate(ctx.input.testId, {
      email: ctx.input.email,
      full_name: ctx.input.fullName,
      force_reattempt: ctx.input.forceReattempt,
      template: ctx.input.templateId,
      invite_valid_from: ctx.input.inviteValidFrom,
      invite_valid_to: ctx.input.inviteValidTo,
      invite_metadata: ctx.input.metadata,
      accommodations:
        ctx.input.additionalTimePercent === undefined
          ? undefined
          : { additional_time_percent: ctx.input.additionalTimePercent },
      send_email: ctx.input.sendEmail,
      force: ctx.input.force,
      tags: ctx.input.tags
    });

    let candidate = result.data ?? result;

    return {
      output: {
        candidate
      },
      message: `Invited **${ctx.input.email}** to test **${ctx.input.testId}**.`
    };
  });
