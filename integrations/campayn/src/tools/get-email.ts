import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { emailSchema, formatEmail } from '../lib/schemas';
import { spec } from '../spec';

export let getEmail = SlateTool.create(spec, {
  name: 'Get Email',
  key: 'get_email',
  description:
    'Retrieve one email campaign by its ID, including its status, recipient count, open and response rates, and preview URLs. Call list_emails to discover email IDs.',
  constraints: ['Looks up the email in the campaigns visible to the authenticated user.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      emailId: z.string().describe('Email ID. Call list_emails to discover email IDs.')
    })
  )
  .output(emailSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let emails = await client.getEmails();
    let email = emails.find(candidate => candidate.id === ctx.input.emailId);
    if (!email) {
      throw createApiServiceError(
        `Email ${ctx.input.emailId} was not found among the visible campaigns. Call list_emails to find an available email ID.`
      );
    }

    return {
      output: formatEmail(email),
      message: `Retrieved email campaign **${email.name}** (${email.id}).`
    };
  })
  .build();
