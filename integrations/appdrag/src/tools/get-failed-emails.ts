import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let getFailedEmails = SlateTool.create(spec, {
  name: 'Get Failed Newsletter Emails',
  key: 'get_failed_emails',
  description: `Retrieve a list of failed newsletter email deliveries. Useful for monitoring delivery issues and cleaning up contact lists.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z
        .string()
        .optional()
        .describe('Only return failures from this date forward. Format: YYYY-MM-DD.')
    })
  )
  .output(
    z.object({
      failedEmails: z.any().describe('List of failed email delivery records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppDragClient({
      apiKey: ctx.auth.token,
      appId: ctx.config.appId
    });

    let failedEmails = await client.newsletterGetFailedMail(ctx.input.fromDate);

    return {
      output: {
        failedEmails
      },
      message: `Retrieved failed email records${ctx.input.fromDate ? ` since ${ctx.input.fromDate}` : ''}.`
    };
  })
  .build();
