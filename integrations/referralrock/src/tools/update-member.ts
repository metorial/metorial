import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update an existing member's profile in a referral program. Identify the member by ID, referral code, email (with program), or external ID (with program). Only the provided fields will be updated.`,
  instructions: [
    'To identify a member, provide either memberId, referralCode, or both email and programId, or both externalIdentifier and programId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().optional().describe('Member ID to update'),
      referralCode: z.string().optional().describe('Referral code of the member to update'),
      email: z
        .string()
        .optional()
        .describe('Email of the member to update (requires programId)'),
      externalIdentifier: z
        .string()
        .optional()
        .describe('External ID of the member to update (requires programId)'),
      programId: z
        .string()
        .optional()
        .describe('Program ID (required when identifying by email or external ID)'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      newEmail: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      newExternalIdentifier: z.string().optional().describe('Updated external ID'),
      dateOfBirth: z.string().optional().describe('Updated date of birth'),
      addressLine1: z.string().optional().describe('Updated address line 1'),
      addressLine2: z.string().optional().describe('Updated address line 2'),
      city: z.string().optional().describe('Updated city'),
      region: z.string().optional().describe('Updated region/state'),
      country: z.string().optional().describe('Updated country'),
      postalCode: z.string().optional().describe('Updated postal code'),
      disabledFlag: z.boolean().optional().describe('Enable or disable the member'),
      customOverrideURL: z.string().optional().describe('Updated custom override URL')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the updated member'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      referralCode: z.string().optional().describe('Referral code'),
      status: z.string().optional().describe('Update result status'),
      statusMessage: z.string().optional().describe('Update result message')
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

    let memberUpdate: Record<string, unknown> = {};
    if (ctx.input.firstName !== undefined) memberUpdate.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) memberUpdate.lastName = ctx.input.lastName;
    if (ctx.input.newEmail !== undefined) memberUpdate.email = ctx.input.newEmail;
    if (ctx.input.phone !== undefined) memberUpdate.phone = ctx.input.phone;
    if (ctx.input.newExternalIdentifier !== undefined)
      memberUpdate.externalIdentifier = ctx.input.newExternalIdentifier;
    if (ctx.input.dateOfBirth !== undefined) memberUpdate.dateOfBirth = ctx.input.dateOfBirth;
    if (ctx.input.addressLine1 !== undefined)
      memberUpdate.addressLine1 = ctx.input.addressLine1;
    if (ctx.input.addressLine2 !== undefined)
      memberUpdate.addressLine2 = ctx.input.addressLine2;
    if (ctx.input.city !== undefined) memberUpdate.city = ctx.input.city;
    if (ctx.input.region !== undefined) memberUpdate.region = ctx.input.region;
    if (ctx.input.country !== undefined) memberUpdate.country = ctx.input.country;
    if (ctx.input.postalCode !== undefined) memberUpdate.postalCode = ctx.input.postalCode;
    if (ctx.input.disabledFlag !== undefined)
      memberUpdate.disabledFlag = ctx.input.disabledFlag;
    if (ctx.input.customOverrideURL !== undefined)
      memberUpdate.customOverrideURL = ctx.input.customOverrideURL;

    let result = await client.updateMembers([{ query, ...memberUpdate }]);

    let results = result as unknown as Record<string, unknown>[];
    let first = Array.isArray(results) ? results[0] : result;
    let member = (first?.member || {}) as Record<string, unknown>;
    let resultInfo = (first?.resultInfo || {}) as Record<string, unknown>;

    return {
      output: {
        memberId: (member.id || ctx.input.memberId || '') as string,
        displayName: member.displayName as string | undefined,
        email: member.email as string | undefined,
        referralCode: member.referralCode as string | undefined,
        status: resultInfo.Status as string | undefined,
        statusMessage: resultInfo.Message as string | undefined
      },
      message: `Updated member **${member.displayName || ctx.input.memberId || 'unknown'}** — ${resultInfo.Message || 'Success'}.`
    };
  })
  .build();
