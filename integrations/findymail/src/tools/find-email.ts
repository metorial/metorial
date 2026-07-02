import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find a verified professional email address for a person. You can search by providing a **name and company domain**, or by providing a **LinkedIn profile URL**. Only returns safe, verified email addresses — risky or invalid catch-all emails are excluded. Duplicate searches are free.`,
  constraints: [
    'Uses 1 credit per successful result.',
    'Only returns verified, deliverable email addresses.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z
        .string()
        .optional()
        .describe('Full name of the person (required when searching by domain).'),
      domain: z.string().optional().describe('Company website domain, e.g. "stripe.com".'),
      linkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL. Use this instead of name+domain if available.')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('The verified email address found.'),
      name: z.string().optional().describe('Full name of the contact.'),
      domain: z.string().optional().describe('Company domain associated with the contact.'),
      found: z.boolean().describe('Whether a verified email was found.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.linkedinUrl) {
      result = await client.findEmailByLinkedIn({ linkedinUrl: ctx.input.linkedinUrl });
    } else if (ctx.input.name && ctx.input.domain) {
      result = await client.findEmailByName({
        name: ctx.input.name,
        domain: ctx.input.domain
      });
    } else {
      throw new Error('Provide either a linkedinUrl, or both name and domain.');
    }

    let contact = result?.contact ?? result;
    let email = contact?.email;

    return {
      output: {
        email: email ?? undefined,
        name: contact?.name ?? ctx.input.name ?? undefined,
        domain: contact?.domain ?? ctx.input.domain ?? undefined,
        found: !!email
      },
      message: email
        ? `Found verified email **${email}** for ${contact?.name ?? ctx.input.name ?? 'the contact'}.`
        : `No verified email found for the given contact.`
    };
  })
  .build();
