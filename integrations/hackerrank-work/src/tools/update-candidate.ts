import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInteger, validateSchedule } from '../lib/validation';
import { spec } from '../spec';

export let updateCandidate = SlateTool.create(spec, {
  key: 'update_candidate',
  name: 'Update Candidate',
  description:
    'Update candidate details, application state, invitation validity, tags, or extra test time for an existing test invitation.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      testId: z.string().describe('Test ID from list_tests'),
      candidateId: z.string().describe('Candidate ID from list_candidates'),
      fullName: z.string().optional().describe('Candidate full name'),
      atsState: z.number().optional().describe('Application state integer from 0 through 22'),
      inviteValidFrom: z
        .string()
        .nullable()
        .optional()
        .describe('Valid-from timestamp, or null for unlimited validity'),
      inviteValidTo: z
        .string()
        .nullable()
        .optional()
        .describe('Valid-until timestamp, or null for unlimited validity'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Candidate invitation metadata'),
      evaluatorEmail: z.string().optional().describe('Evaluator email address'),
      tags: z.array(z.string()).optional().describe('Candidate tags'),
      additionalTimePercent: z
        .number()
        .optional()
        .describe('Positive integer percentage of extra test time')
    })
  )
  .output(
    z.object({
      candidate: z.record(z.string(), z.any()).describe('Updated candidate details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    validateInteger(ctx.input.atsState, 'atsState', 0);
    if (ctx.input.atsState !== undefined && ctx.input.atsState > 22)
      throw createApiServiceError('atsState must be between 0 and 22.');
    validateInteger(ctx.input.additionalTimePercent, 'additionalTimePercent', 1);
    validateSchedule(
      ctx.input.inviteValidFrom ?? undefined,
      ctx.input.inviteValidTo ?? undefined
    );
    let data = pickDefined({
      full_name: ctx.input.fullName,
      ats_state: ctx.input.atsState,
      invite_valid_from: ctx.input.inviteValidFrom,
      invite_valid_to: ctx.input.inviteValidTo,
      invite_metadata: ctx.input.metadata,
      evaluator_email: ctx.input.evaluatorEmail,
      tags: ctx.input.tags,
      accommodations:
        ctx.input.additionalTimePercent === undefined
          ? undefined
          : { additional_time_percent: ctx.input.additionalTimePercent }
    });
    if (Object.keys(data).length === 0)
      throw createApiServiceError('Provide at least one candidate field to update.');
    await client.updateCandidate(ctx.input.testId, ctx.input.candidateId, data);
    let result = await client.getCandidate(ctx.input.testId, ctx.input.candidateId);
    return {
      message: 'Update candidate completed.',
      output: { candidate: result.data ?? result }
    };
  });
