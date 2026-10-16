import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient, optionalString, requireId, requireRecord } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the connected business profile from Finmei, including business details and account info.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('Connected business ID'),
      name: z.string().optional().describe('User or business name'),
      email: z.string().optional().describe('Email address'),
      businessName: z.string().optional().describe('Business name'),
      businessId: z.string().optional().describe('Connected business ID'),
      businessType: z.string().optional().describe('Company or individual business'),
      rawProfile: z.any().optional().describe('Full profile data from API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.getProfile();
    let envelope = requireRecord(result, 'profile');
    let profile = requireRecord('data' in envelope ? envelope.data : envelope, 'profile');
    let businessId = requireId(profile.business_id ?? profile.id, 'business ID');

    return {
      output: pickDefined({
        userId: businessId,
        name: optionalString(profile.business_title ?? profile.name, 'profile name'),
        email: optionalString(profile.email, 'profile email'),
        businessName: optionalString(
          profile.company_name ?? profile.business_name,
          'business name'
        ),
        businessId,
        businessType: optionalString(profile.business_type, 'business type'),
        rawProfile: profile
      }),
      message: `Retrieved profile for **${profile.business_title ?? profile.name ?? businessId}**.`
    };
  })
  .build();
