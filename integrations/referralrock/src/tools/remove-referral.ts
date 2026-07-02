import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let removeReferral = SlateTool.create(spec, {
  name: 'Remove Referral',
  key: 'remove_referral',
  description: `Remove a referral from a program. Identify the referral by ID, email (with program), or external ID (with program).`,
  instructions: [
    'Provide either referralId, or both email and programId, or both externalIdentifier and programId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      referralId: z.string().optional().describe('Referral ID to remove'),
      email: z.string().optional().describe('Email of the referral (requires programId)'),
      externalIdentifier: z
        .string()
        .optional()
        .describe('External ID of the referral (requires programId)'),
      programId: z
        .string()
        .optional()
        .describe('Program ID (required when not using referralId)')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Result status'),
      statusMessage: z.string().optional().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let query: Record<string, unknown> = {};

    if (ctx.input.referralId) {
      query = { primaryInfo: { referralId: ctx.input.referralId } };
    } else {
      query = {
        secondaryInfo: {
          ...(ctx.input.email && { email: ctx.input.email }),
          ...(ctx.input.externalIdentifier && {
            externalIdentifier: ctx.input.externalIdentifier
          })
        },
        tertiaryInfo: {
          ...(ctx.input.programId && { ProgramId: ctx.input.programId })
        }
      };
    }

    let result = await client.removeReferrals([{ query }]);

    let results = result as unknown as Record<string, unknown>[];
    let first = Array.isArray(results) ? results[0] : result;
    let resultInfo = (first?.resultInfo || {}) as Record<string, unknown>;

    return {
      output: {
        status: resultInfo.Status as string | undefined,
        statusMessage: resultInfo.Message as string | undefined
      },
      message: `Referral removal: ${resultInfo.Message || 'Completed'}.`
    };
  })
  .build();
