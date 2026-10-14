import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let checkEmailDelivery = SlateTool.create(spec, {
  name: 'Check Email Delivery',
  key: 'check_email_delivery',
  description:
    'Check delivery statuses for individual emails sent with send_email. Delivery statuses are retained for one month.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      emailIds: z
        .array(z.union([z.string().min(1), z.number()]))
        .min(1)
        .max(500)
        .describe(
          'Up to 500 email_id or id values returned by send_email; preserve string IDs as text'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Delivery statuses keyed by email message ID'),
      failedEmailIds: z
        .any()
        .optional()
        .describe(
          'Provider-reported email IDs that could not be checked, with their failure reasons'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({ token: ctx.auth.token, locale: ctx.config.locale });
    let { result, failed_email_id: failedEmailIds } = await client.checkEmail({
      email_id: ctx.input.emailIds
    });
    let statusCount =
      isApiErrorRecord(result) && Array.isArray(result.statuses) ? result.statuses.length : 0;
    let failureCount = Array.isArray(failedEmailIds)
      ? failedEmailIds.reduce(
          (count, entry) => count + (isApiErrorRecord(entry) ? Object.keys(entry).length : 0),
          0
        )
      : undefined;
    let failures =
      failureCount !== undefined
        ? `; ${failureCount} failed email check(s)`
        : failedEmailIds !== undefined
          ? '; the provider returned failure details'
          : '';
    return {
      output: { result, failedEmailIds },
      message: `Retrieved ${statusCount} email delivery status(es)${failures}`
    };
  })
  .build();
