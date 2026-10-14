import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { emailSchema } from '../lib/types';
import { spec } from '../spec';

export let listEmails = SlateTool.create(spec, {
  name: 'List Forwarding Addresses',
  key: 'list_emails',
  description:
    'List configured support email addresses, their IDs, and forwarding destinations. Use an address ID as forwardingAddressId when creating a ticket.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ emails: z.array(emailSchema).describe('Configured support email addresses') })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });
    let emails = await client.listEmails();
    return {
      output: { emails },
      message: `Retrieved **${emails.length}** forwarding addresses`
    };
  })
  .build();
