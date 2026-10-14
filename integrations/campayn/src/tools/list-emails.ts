import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { emailSchema, formatEmail } from '../lib/schemas';
import { spec } from '../spec';

export let listEmails = SlateTool.create(spec, {
  name: 'List Emails',
  key: 'list_emails',
  description: `Retrieve all email campaigns visible to the authenticated user, including status, send count, open/response rates, and preview URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      emails: z.array(emailSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let emails = await client.getEmails();

    let mapped = emails.map(formatEmail);

    return {
      output: { emails: mapped },
      message: `Found **${mapped.length}** email campaign(s).`
    };
  })
  .build();
