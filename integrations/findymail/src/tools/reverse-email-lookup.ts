import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let reverseEmailLookup = SlateTool.create(spec, {
  name: 'Reverse Email Lookup',
  key: 'reverse_email_lookup',
  description: `Find a LinkedIn profile and professional details from an email address. Optionally include full profile enrichment with additional details like headline, job title, and company.`,
  constraints: ['Uses 1 credit without profile data, 2 credits with full profile enrichment.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to look up.'),
      withProfile: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include full profile enrichment (costs an additional credit).')
    })
  )
  .output(
    z.object({
      fullName: z.string().optional().describe('Full name of the person.'),
      headline: z.string().optional().describe('LinkedIn headline.'),
      jobTitle: z.string().optional().describe('Current job title.'),
      companyName: z.string().optional().describe('Current company name.'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.reverseEmailLookup({
      email: ctx.input.email,
      withProfile: ctx.input.withProfile
    });

    return {
      output: {
        fullName: result?.fullName ?? result?.full_name ?? undefined,
        headline: result?.headline ?? undefined,
        jobTitle: result?.jobTitle ?? result?.job_title ?? undefined,
        companyName: result?.companyName ?? result?.company_name ?? undefined,
        linkedinUrl: result?.linkedinUrl ?? result?.linkedin_url ?? undefined
      },
      message:
        result?.fullName || result?.full_name
          ? `Found profile for **${result?.fullName ?? result?.full_name}**${result?.companyName || result?.company_name ? ` at ${result?.companyName ?? result?.company_name}` : ''}.`
          : `No profile found for **${ctx.input.email}**.`
    };
  })
  .build();
