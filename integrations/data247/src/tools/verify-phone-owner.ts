import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyPhoneOwner = SlateTool.create(spec, {
  name: 'Verify Phone Owner',
  key: 'verify_phone_owner',
  description:
    'Check whether a phone number belongs to a specified person or company. Returns the ownership match, actual subscriber name, phone type, and whether the phone is in service.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      phone: z.string().describe('Phone number to verify'),
      name: z.string().optional().describe('Subscriber name; provide this or company'),
      company: z.string().optional().describe('Company name; provide this or name')
    })
  )
  .output(
    z.object({
      phone: z.string().optional().describe('Phone number queried'),
      match: z.string().optional().describe('Whether ownership matches: YES or NO'),
      name: z.string().optional().describe('Actual subscriber name'),
      type: z.string().optional().describe('L for landline, M for mobile, or V for VOIP'),
      inService: z
        .string()
        .optional()
        .describe('Y or N indicating whether the phone is reachable')
    })
  )
  .handleInvocation(async ctx => {
    let name = ctx.input.name?.trim();
    let company = ctx.input.company?.trim();
    if ((!name && !company) || (name && company)) {
      throw createApiServiceError('Provide exactly one subscriber name or company name.');
    }
    let raw = await new Client(ctx.auth.token).verifyPhoneOwner({
      phone: ctx.input.phone,
      name: name || undefined,
      company: company || undefined
    });
    return {
      output: {
        phone: raw.phone,
        match: raw.match,
        name: raw.name,
        type: raw.type,
        inService: raw.in_service
      },
      message: `Phone ownership match: **${raw.match || 'Unknown'}**.`
    };
  })
  .build();
