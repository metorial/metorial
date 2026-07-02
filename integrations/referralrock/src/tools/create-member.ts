import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let createMember = SlateTool.create(spec, {
  name: 'Create Member',
  key: 'create_member',
  description: `Add a new member (advocate) to a referral program. The member will receive a unique referral code and URL for sharing. Requires at minimum a program ID, first name, and email.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: z.string().describe('Program ID to add the member to'),
      firstName: z.string().describe('First name of the member'),
      email: z.string().describe('Email address of the member'),
      lastName: z.string().optional().describe('Last name'),
      referralCode: z
        .string()
        .optional()
        .describe('Custom referral code (auto-generated if not provided)'),
      phone: z.string().optional().describe('Phone number'),
      externalIdentifier: z.string().optional().describe('External system identifier'),
      dateOfBirth: z.string().optional().describe('Date of birth'),
      addressLine1: z.string().optional().describe('Address line 1'),
      addressLine2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      region: z.string().optional().describe('Region/state (ISO 3166-2 subdivision code)'),
      country: z.string().optional().describe('Country (ISO 3166-2 code)'),
      postalCode: z.string().optional().describe('Postal code'),
      disabledFlag: z.boolean().optional().describe('Create as disabled'),
      customOverrideURL: z.string().optional().describe('Custom override URL')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the created member'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      referralCode: z.string().optional().describe('Assigned referral code'),
      referralUrl: z.string().optional().describe('Sharing referral URL'),
      programId: z.string().optional().describe('Program ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.createMember(ctx.input);
    let member = (result.member || result) as Record<string, unknown>;

    return {
      output: {
        memberId: member.id as string,
        displayName: member.displayName as string | undefined,
        email: member.email as string | undefined,
        referralCode: member.referralCode as string | undefined,
        referralUrl: member.referralUrl as string | undefined,
        programId: member.programId as string | undefined
      },
      message: `Created member **${ctx.input.firstName}** (${ctx.input.email}) with referral code **${member.referralCode || 'auto-assigned'}**.`
    };
  })
  .build();
