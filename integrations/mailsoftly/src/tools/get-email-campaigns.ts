import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let getEmailCampaigns = SlateTool.create(spec, {
  name: 'Get Email Campaigns',
  key: 'get_email_campaigns',
  description: `Retrieves a page of email campaigns for the firm, or checks the status of a specific email draft by its ID.
- Omit **emailId** to list a page of email campaigns; use hasMore to continue.
- Provide an **emailId** to fetch the status and readiness of a specific email draft.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number when listing campaigns. Defaults to 1.'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Campaigns per page. Defaults to 50; maximum 100.'),
      status: z
        .enum(['draft', 'review', 'sending', 'sent'])
        .optional()
        .describe('Filter campaign listings by status.'),
      query: z
        .string()
        .optional()
        .describe('Search campaign names and subjects when listing.'),
      emailId: z
        .string()
        .optional()
        .describe('ID of a specific email draft to check status for.')
    })
  )
  .output(
    z.object({
      page: z.number().optional(),
      perPage: z.number().optional(),
      total: z.number().optional(),
      hasMore: z.boolean().optional().describe('Request the next page when true.'),
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

    if (
      ctx.input.emailId !== undefined &&
      (ctx.input.page !== undefined ||
        ctx.input.perPage !== undefined ||
        ctx.input.status !== undefined ||
        ctx.input.query !== undefined)
    ) {
      throw createApiServiceError(
        'Listing filters and pagination cannot be used with emailId.'
      );
    }

    if (ctx.input.emailId !== undefined) {
      let emailStatus = await client.getEmailStatus(ctx.input.emailId);
      return {
        output: { emailStatus },
        message: `Retrieved status for email draft **${ctx.input.emailId}**.`
      };
    }

    let { items: campaigns, ...pagination } = await client.getEmails(ctx.input);
    return {
      output: { campaigns, ...pagination },
      message: `Retrieved **${campaigns.length}** email campaign(s).`
    };
  })
  .build();
