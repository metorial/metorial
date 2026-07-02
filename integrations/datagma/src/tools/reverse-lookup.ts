import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reverseLookup = SlateTool.create(spec, {
  name: 'Reverse Lookup',
  key: 'reverse_lookup',
  description: `Look up a person's identity from a phone number or email address. Phone lookup returns name, Facebook ID, and LinkedIn profile URL. Email lookup returns detailed profile information including work history, education, skills, and social profiles.
Email reverse lookup is limited to contacts **outside the EU**.`,
  instructions: [
    'Provide either a phone number or an email address to look up.',
    'For phone lookup, include the country code with a + sign (e.g. "+33" for France).',
    'Email reverse lookup only works for contacts outside the EU. For professional emails, consider using the Enrich Person tool instead.'
  ],
  constraints: [
    'Email reverse lookup is limited to contacts outside the EU.',
    'Rate limited to 10 requests per second.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      lookupType: z.enum(['phone', 'email']).describe('Type of reverse lookup to perform'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number to look up (required when lookupType is "phone")'),
      countryCode: z
        .string()
        .optional()
        .describe('Country code with + sign (e.g. "+33" for France, "+1" for US)'),
      email: z
        .string()
        .optional()
        .describe(
          'Email address to look up (required when lookupType is "email", outside EU only)'
        )
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Name of the person found'),
      facebookId: z.string().optional().describe('Facebook ID if found (phone lookup)'),
      linkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL if found (phone lookup)'),
      personalInformation: z
        .any()
        .optional()
        .describe(
          'Detailed personal info (email lookup): name, emails, phone, headline, company, location, photo'
        ),
      positions: z.array(z.any()).optional().describe('Work history (email lookup)'),
      schools: z.array(z.any()).optional().describe('Education history (email lookup)'),
      skills: z.any().optional().describe('Skills and endorsements (email lookup)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.lookupType === 'phone') {
      if (!ctx.input.phoneNumber) {
        throw new Error('phoneNumber is required for phone reverse lookup');
      }

      let result = await client.reversePhoneLookup({
        number: ctx.input.phoneNumber,
        code: ctx.input.countryCode
      });

      return {
        output: {
          name: result?.name,
          facebookId: result?.facebookID,
          linkedinUrl: result?.linkedinPubProfileUrl
        },
        message: `Reverse phone lookup for **${ctx.input.countryCode || ''}${ctx.input.phoneNumber}**: ${result?.name ? `found **${result.name}**` : 'no match found'}.`
      };
    } else {
      if (!ctx.input.email) {
        throw new Error('email is required for email reverse lookup');
      }

      let result = await client.reverseEmailLookup({
        email: ctx.input.email
      });

      let personName = result?.personalInformation?.name || 'Unknown';

      return {
        output: {
          name: result?.personalInformation?.name,
          personalInformation: result?.personalInformation,
          positions: result?.positions,
          schools: result?.schools,
          skills: result?.skillsAndEndorsements
        },
        message: `Reverse email lookup for **${ctx.input.email}**: ${result?.personalInformation?.name ? `found **${personName}**` : 'no match found'}.`
      };
    }
  })
  .build();
