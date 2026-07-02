import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmailTemplates = SlateTool.create(spec, {
  name: 'List Email Templates',
  key: 'list_email_templates',
  description: `Retrieve all email templates stored in your Dripcel account. Templates are referenced by ID when sending bulk emails.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(z.any()).describe('Array of email template objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getEmailTemplates();
    let templates = result.data?.templates ?? [];
    return {
      output: { templates },
      message: `Found **${templates.length}** email template(s).`
    };
  })
  .build();
