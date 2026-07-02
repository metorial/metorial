import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let getEmailCampaigns = SlateTool.create(spec, {
  name: 'Get Email Campaigns',
  key: 'get_email_campaigns',
  description: `Retrieves a list of all email campaigns for the firm, or checks the status of a specific email draft by its ID.
- Omit **emailId** to list all email campaigns.
- Provide an **emailId** to fetch the status and readiness of a specific email draft.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      emailId: z
        .string()
        .optional()
        .describe('ID of a specific email draft to check status for.')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(z.any())
        .optional()
        .describe('List of email campaigns (when listing all).'),
      emailStatus: z
        .any()
        .optional()
        .describe('Status of the specific email draft (when emailId provided).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    if (ctx.input.emailId) {
      let emailStatus = await client.getEmailStatus(ctx.input.emailId);
      return {
        output: { emailStatus },
        message: `Retrieved status for email draft **${ctx.input.emailId}**.`
      };
    }

    let campaigns = await client.getEmails();
    return {
      output: { campaigns },
      message: `Retrieved **${campaigns.length}** email campaign(s).`
    };
  })
  .build();
