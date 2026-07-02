import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let createReferral = SlateTool.create(spec, {
  name: 'Create Referral',
  key: 'create_referral',
  description: `Add a new referral to a program using a member's referral code. The referral represents a person or lead referred by an existing member. Can optionally set the initial status and amount.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      referralCode: z.string().describe('Referral code of the referring member'),
      firstName: z.string().optional().describe('First name of the referred person'),
      lastName: z.string().optional().describe('Last name of the referred person'),
      email: z.string().optional().describe('Email of the referred person'),
      phoneNumber: z.string().optional().describe('Phone number'),
      externalIdentifier: z.string().optional().describe('External system identifier'),
      amount: z.number().optional().describe('Referral order amount'),
      companyName: z.string().optional().describe('Company name'),
      note: z.string().optional().describe('Internal note'),
      publicNote: z.string().optional().describe('Public note visible to the member'),
      status: z
        .enum(['pending', 'qualified', 'approved', 'denied'])
        .optional()
        .describe('Initial referral status'),
      preferredContact: z
        .enum(['email', 'callMorning', 'callAfternoon', 'callEvening'])
        .optional()
        .describe('Preferred contact method'),
      addressLine1: z.string().optional().describe('Address line 1'),
      addressLine2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      region: z.string().optional().describe('Region/state (ISO 3166-2)'),
      postalCode: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country (ISO 3166-2)')
    })
  )
  .output(
    z.object({
      referralId: z.string().describe('ID of the created referral'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email'),
      status: z.string().optional().describe('Referral status'),
      referringMemberId: z.string().optional().describe('Referring member ID'),
      programId: z.string().optional().describe('Program ID'),
      message: z.string().optional().describe('API confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.createReferral(ctx.input);
    let referral = (result.referral || result) as Record<string, unknown>;

    return {
      output: {
        referralId: referral.id as string,
        displayName: referral.displayName as string | undefined,
        email: referral.email as string | undefined,
        status: referral.status as string | undefined,
        referringMemberId: referral.referringMemberId as string | undefined,
        programId: referral.programId as string | undefined,
        message: result.message as string | undefined
      },
      message: `Created referral for **${ctx.input.firstName || ctx.input.email || 'unknown'}** via referral code **${ctx.input.referralCode}**.`
    };
  })
  .build();
