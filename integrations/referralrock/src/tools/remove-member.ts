import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let removeMember = SlateTool.create(spec, {
  name: 'Remove Member',
  key: 'remove_member',
  description: `Remove a member from a referral program. Identify the member by ID, referral code, email (with program), or external ID (with program).`,
  instructions: [
    'Provide either memberId, referralCode, or both email and programId, or both externalIdentifier and programId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().optional().describe('Member ID to remove'),
      referralCode: z.string().optional().describe('Referral code of the member to remove'),
      email: z
        .string()
        .optional()
        .describe('Email of the member to remove (requires programId)'),
      externalIdentifier: z
        .string()
        .optional()
        .describe('External ID of the member to remove (requires programId)'),
      programId: z
        .string()
        .optional()
        .describe('Program ID (required when identifying by email or external ID)')
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

    if (ctx.input.memberId || ctx.input.referralCode) {
      query = {
        primaryInfo: {
          ...(ctx.input.memberId && { memberId: ctx.input.memberId }),
          ...(ctx.input.referralCode && { referralCode: ctx.input.referralCode })
        }
      };
    } else {
      query = {
        secondaryInfo: {
          ...(ctx.input.email && { email: ctx.input.email }),
          ...(ctx.input.externalIdentifier && {
            externalIdentifier: ctx.input.externalIdentifier
          })
        },
        tertiaryInfo: {
          ...(ctx.input.programId && { programId: ctx.input.programId })
        }
      };
    }

    let result = await client.removeMembers([{ query }]);

    let results = result as unknown as Record<string, unknown>[];
    let first = Array.isArray(results) ? results[0] : result;
    let resultInfo = (first?.resultInfo || {}) as Record<string, unknown>;

    return {
      output: {
        status: resultInfo.Status as string | undefined,
        statusMessage: resultInfo.Message as string | undefined
      },
      message: `Member removal: ${resultInfo.Message || 'Completed'}.`
    };
  })
  .build();
