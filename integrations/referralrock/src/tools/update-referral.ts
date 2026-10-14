import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getFirstResult, getResponseRecords, ReferralRockClient } from '../lib/client';
import { referralQuery } from '../lib/queries';
import { spec } from '../spec';

export let updateReferral = SlateTool.create(spec, {
  name: 'Update Referral',
  key: 'update_referral',
  description: `Update an existing referral's details or status. Identify the referral by ID, email (with program), external ID (with program), or phone number (with program). Use this to progress referrals through the approval workflow.`,
  instructions: [
    'Provide referralId, or programId with email, externalIdentifier, or phoneNumber. Use list_programs and list_referrals to find IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      referralId: z.string().optional().describe('Referral ID to update'),
      email: z
        .string()
        .optional()
        .describe('Email of the referral to update (requires programId)'),
      externalIdentifier: z
        .string()
        .optional()
        .describe('External ID of the referral (requires programId)'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number of the referral (requires programId)'),
      programId: z
        .string()
        .optional()
        .describe('Program ID (required when not using referralId)'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      newEmail: z.string().optional().describe('Updated email'),
      newExternalIdentifier: z.string().optional().describe('Updated external ID'),
      amount: z.number().optional().describe('Updated referral amount'),
      status: z
        .enum(['pending', 'qualified', 'approved', 'denied'])
        .optional()
        .describe('Updated referral status'),
      companyName: z.string().optional().describe('Updated company name'),
      note: z.string().optional().describe('Updated internal note'),
      publicNote: z.string().optional().describe('Updated public note'),
      preferredContact: z
        .enum(['email', 'callMorning', 'callAfternoon', 'callEvening'])
        .optional()
        .describe('Updated preferred contact method')
    })
  )
  .output(
    z.object({
      referralId: z.string().describe('ID of the updated referral'),
      status: z.string().optional().describe('Update result status'),
      statusMessage: z.string().optional().describe('Update result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let query = referralQuery(ctx.input);
    let referralId = ctx.input.referralId;
    if (!referralId) {
      let matches = await client.listReferrals({
        programId: ctx.input.programId,
        query: ctx.input.email || ctx.input.externalIdentifier
      });
      let referrals = getResponseRecords(matches.referrals, 'referral lookup').filter(
        referral =>
          (!ctx.input.email || referral.email === ctx.input.email) &&
          (!ctx.input.externalIdentifier ||
            referral.externalIdentifier === ctx.input.externalIdentifier) &&
          (!ctx.input.phoneNumber || referral.phoneNumber === ctx.input.phoneNumber)
      );
      if (referrals.length !== 1 || typeof referrals[0]?.id !== 'string') {
        throw createApiServiceError(
          'The referral query must match exactly one referral. Use list_referrals to find its referralId.'
        );
      }
      referralId = referrals[0].id;
    }

    let referralUpdate: Record<string, unknown> = {};
    if (ctx.input.firstName !== undefined) referralUpdate.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) referralUpdate.lastName = ctx.input.lastName;
    if (ctx.input.newEmail !== undefined) referralUpdate.email = ctx.input.newEmail;
    if (ctx.input.newExternalIdentifier !== undefined)
      referralUpdate.externalIdentifier = ctx.input.newExternalIdentifier;
    if (ctx.input.amount !== undefined) referralUpdate.amount = ctx.input.amount;
    if (ctx.input.status !== undefined) referralUpdate.status = ctx.input.status;
    if (ctx.input.companyName !== undefined)
      referralUpdate.companyName = ctx.input.companyName;
    if (ctx.input.note !== undefined) referralUpdate.note = ctx.input.note;
    if (ctx.input.publicNote !== undefined) referralUpdate.publicNote = ctx.input.publicNote;
    if (ctx.input.preferredContact !== undefined)
      referralUpdate.preferredContact = ctx.input.preferredContact;

    let result = await client.updateReferrals([{ query, referral: referralUpdate }]);

    let first = getFirstResult(result);
    let resultInfo = (first?.resultInfo || {}) as Record<string, unknown>;
    let referral = (first?.referral || {}) as Record<string, unknown>;

    return {
      output: {
        referralId: (referral.id || referralId) as string,
        status: resultInfo.Status as string | undefined,
        statusMessage: resultInfo.Message as string | undefined
      },
      message: `Referral update result: ${resultInfo.Message || resultInfo.Status || 'Request processed'}${ctx.input.status ? ` — requested status **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
