import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let domainSearch = SlateTool.create(spec, {
  name: 'Domain Search',
  key: 'domain_search',
  description: `Find verified email addresses linked to any domain. Returns functional email addresses like "contact@", "support@", "info@" with confidence scores.

All discovered emails are verified to filter out bad or outdated addresses.`,
  instructions: ['Provide the domain name to search for associated email addresses.'],
  constraints: ['Only charges for email addresses returned with medium confidence or higher.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('The domain to search for email addresses (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().describe('The discovered email address'),
            confidence: z.string().describe('Confidence score of the result')
          })
        )
        .describe('List of verified email addresses found for the domain'),
      totalFound: z.number().describe('Total number of email addresses found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contacts = await client.domainSearch(ctx.input.domain);

    return {
      output: {
        contacts,
        totalFound: contacts.length
      },
      message: `Found **${contacts.length}** email address(es) for domain **${ctx.input.domain}**`
    };
  })
  .build();
