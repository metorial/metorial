import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPhone = SlateTool.create(spec, {
  name: 'Search Phone Number',
  key: 'search_phone',
  description: `Find mobile direct line phone numbers for a contact using their email address or LinkedIn profile URL. All numbers returned are certified mobile direct line phone numbers.
Optionally verify if the phone number is linked to a WhatsApp account.`,
  instructions: [
    'Provide an email address, a social media profile URL (not Sales Navigator), or both for better results.',
    'Lower the minimumMatch score for more results at the cost of accuracy.'
  ],
  constraints: [
    'Rate limited to 10 requests per second.',
    'Phone number search costs 30 credits.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the contact'),
      profileUrl: z
        .string()
        .optional()
        .describe('Social media profile URL (LinkedIn, not Sales Navigator)'),
      minimumMatch: z
        .number()
        .optional()
        .default(1)
        .describe(
          'Minimum match score (0-1). Lower values return more results but with less accuracy'
        ),
      whatsappCheck: z
        .boolean()
        .optional()
        .default(false)
        .describe('Verify if the phone number is linked to a WhatsApp account')
    })
  )
  .output(
    z.object({
      person: z
        .any()
        .optional()
        .describe('Person data including names, phones, emails, jobs, addresses'),
      possiblePersons: z
        .array(z.any())
        .optional()
        .describe('Alternative person matches if multiple candidates found'),
      visibleSources: z.number().optional().describe('Number of visible data sources'),
      availableSources: z.number().optional().describe('Number of available data sources'),
      personCount: z.number().optional().describe('Number of person matches found'),
      creditBurn: z.number().optional().describe('Number of credits consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.searchPhone({
      email: ctx.input.email,
      username: ctx.input.profileUrl,
      minimumMatch: ctx.input.minimumMatch,
      whatsappCheck: ctx.input.whatsappCheck
    });

    let phones = result?.person?.phones || [];
    let phoneCount = Array.isArray(phones) ? phones.length : 0;

    return {
      output: {
        person: result?.person,
        possiblePersons: result?.possible_persons,
        visibleSources: result?.visible_sources,
        availableSources: result?.available_sources,
        personCount: result?.person_count,
        creditBurn: result?.creditBurn
      },
      message: `Found **${phoneCount}** phone number(s) for ${ctx.input.email || ctx.input.profileUrl || 'the contact'}.`
    };
  })
  .build();
