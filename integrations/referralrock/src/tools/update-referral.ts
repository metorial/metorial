import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let updateReferral = SlateTool.create(spec, {
  name: 'Update Referral',
  key: 'update_referral',
  description: `Update an existing referral's details or status. Identify the referral by ID, email (with program), external ID (with program), or phone number (with program). Use this to progress referrals through the approval workflow.`,
  instructions: [
    'Provide either referralId, or both email and programId, or both externalIdentifier and programId.'
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

    let query: Record<string, unknown> = {};

    if (ctx.input.referralId) {
      query = {
        primaryInfo: { referralId: ctx.input.referralId }
      };
    } else {
      query = {
        secondaryInfo: {
          ...(ctx.input.email && { email: ctx.input.email }),
          ...(ctx.input.externalIdentifier && {
            externalIdentifier: ctx.input.externalIdentifier
          }),
          ...(ctx.input.phoneNumber && { phoneNumber: ctx.input.phoneNumber })
        },
        tertiaryInfo: {
          ...(ctx.input.programId && { ProgramId: ctx.input.programId })
        }
      };
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

    let results = result as unknown as Record<string, unknown>[];
    let first = Array.isArray(results) ? results[0] : result;
    let resultInfo = (first?.resultInfo || {}) as Record<string, unknown>;
    let referral = (first?.referral || {}) as Record<string, unknown>;

    return {
      output: {
        referralId: (referral.id || ctx.input.referralId || '') as string,
        status: resultInfo.Status as string | undefined,
        statusMessage: resultInfo.Message as string | undefined
      },
      message: `Referral update: ${resultInfo.Message || 'Completed'}${ctx.input.status ? ` — status set to **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
