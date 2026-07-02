import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let findPhone = SlateTool.create(spec, {
  name: 'Find Phone Number',
  key: 'find_phone',
  description: `Find a direct phone number for a person from their LinkedIn profile URL. GDPR compliant — excludes EU citizens.`,
  constraints: [
    'Uses 10 credits per successful result.',
    'GDPR compliant: will not return phone numbers for EU citizens.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkedinUrl: z.string().describe('LinkedIn profile URL of the person.')
    })
  )
  .output(
    z.object({
      phone: z.string().optional().describe('The direct phone number found.'),
      found: z.boolean().describe('Whether a phone number was found.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.findPhone({ linkedinUrl: ctx.input.linkedinUrl });

    let phone = result?.phone ?? result?.phone_number ?? undefined;

    return {
      output: {
        phone,
        found: !!phone
      },
      message: phone
        ? `Found phone number **${phone}**.`
        : `No phone number found for the given LinkedIn profile.`
    };
  })
  .build();
