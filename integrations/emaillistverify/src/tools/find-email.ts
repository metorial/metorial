import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find candidate business email addresses by person name and company domain. Generates potential email addresses and checks them in real time.

Provide a first name, last name, and domain for best accuracy. If only a domain is provided, functional emails like "contact@" or "support@" will be returned. Each result includes a confidence score.`,
  instructions: [
    'Provide at least a domain to search. For better accuracy, include both first name and last name.',
    'Results are returned with a confidence score indicating reliability.'
  ],
  constraints: [
    'A search with a name costs five credits; a domain-only search costs ten. Inspect confidence and verification result before using a candidate.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('The company domain to search (e.g., "example.com")'),
      firstName: z.string().optional().describe('First name of the person to find'),
      lastName: z.string().optional().describe('Last name of the person to find')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().describe('The discovered email address'),
            confidence: z.string().describe('Confidence score of the result'),
            result: z
              .string()
              .optional()
              .describe(
                'Deliverability status of this candidate, when returned by the provider'
              )
          })
        )
        .describe('List of discovered email addresses with confidence scores'),
      totalFound: z.number().describe('Total number of email addresses found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contacts = await client.findEmail({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      domain: ctx.input.domain
    });

    return {
      output: {
        contacts,
        totalFound: contacts.length
      },
      message: `Found **${contacts.length}** email address(es) for domain **${ctx.input.domain}**${ctx.input.firstName ? ` matching ${ctx.input.firstName} ${ctx.input.lastName ?? ''}`.trim() : ''}`
    };
  })
  .build();
