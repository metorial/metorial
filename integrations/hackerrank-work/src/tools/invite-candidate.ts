import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
        .describe('Whether to send an email invitation (default true)'),
      force: z
        .boolean()
        .optional()
        .describe('Force re-invite even if candidate was already invited'),
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

    let result = await client.inviteCandidate(ctx.input.testId, {
      email: ctx.input.email,
      full_name: ctx.input.fullName,
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
