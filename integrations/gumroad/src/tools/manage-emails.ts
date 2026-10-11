import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadServiceError } from '../lib/errors';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let emailSchema = z.object({
  emailId: z.string().describe('Unique audience email ID'),
  subject: z.string().optional().describe('Subject line'),
  body: z.string().optional().describe('HTML email body'),
  audienceType: z
    .string()
    .optional()
    .describe(
      'Audience type, for example "audience" (customers and followers), "seller" (customers), "follower", "product", or "variant"'
    ),
  productId: z.string().optional().describe('Targeted product ID for product emails'),
  state: z.string().optional().describe('Email state: "draft", "scheduled", or "published"'),
  publishedAt: z.string().optional().describe('When the email was published'),
  scheduledAt: z.string().optional().describe('When the email is scheduled to publish'),
  sendEmails: z.boolean().optional().describe('Whether the post is emailed to its audience'),
  shownOnProfile: z
    .boolean()
    .optional()
    .describe('Whether the post is shown on the seller profile'),
  recipientsCount: z
    .number()
    .optional()
    .describe('Delivered recipient count, available after publishing'),
  url: z.string().optional().describe('Public post URL, available after publishing'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapEmail = (email: any) => ({
  emailId: email.id,
  subject: email.subject ?? undefined,
  body: email.message ?? undefined,
  audienceType: email.audience_type ?? undefined,
  productId: email.product_id ?? undefined,
  state: email.state ?? undefined,
  publishedAt: email.published_at ?? undefined,
  scheduledAt: email.scheduled_at ?? undefined,
  sendEmails: email.send_emails ?? undefined,
  shownOnProfile: email.shown_on_profile ?? undefined,
  recipientsCount: email.recipients_count ?? undefined,
  url: email.url ?? undefined,
  createdAt: email.created_at ?? undefined,
  updatedAt: email.updated_at ?? undefined
});

let requireInput = <T>(value: T | undefined, field: string, action: string): T => {
  if (value === undefined || value === null || value === '') {
    throw gumroadServiceError(`${field} is required for the "${action}" action.`);
  }
  return value;
};

export let manageEmails = SlateTool.create(spec, {
  name: 'Manage Audience Emails',
  key: 'manage_emails',
  description: `List, read, draft, preview, send, schedule, unschedule, or delete Gumroad audience emails (posts) sent to customers, followers, or buyers of a specific product.`,
  instructions: [
    '"create" always saves a draft. Use "send_preview" to email a preview to the account owner, then "send" or "schedule" to deliver it.',
    '"send" immediately publishes the email to its whole audience and cannot be undone. Confirm with the user before sending. A scheduled email must be unscheduled before it can be sent immediately.',
    'For "schedule", pass scheduledAt as a date and time in the seller\'s Gumroad timezone, for example "2026-07-01 14:00". Scheduling an already-scheduled email replaces its time; "unschedule" turns it back into a draft.',
    'Use audience "product" with productId to email only buyers of one product.',
    'Use pageKey from a previous list response to get the next page. Up to 10 emails are returned per page, newest first.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(gumroadActionScopes.editEmails)
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'send_preview',
          'send',
          'schedule',
          'unschedule',
          'delete'
        ])
        .describe('Action to perform'),
      emailId: z
        .string()
        .optional()
        .describe('Audience email ID (required for every action except list and create)'),
      state: z
        .enum(['draft', 'scheduled', 'published'])
        .optional()
        .describe('Only return emails in this state (for list)'),
      pageKey: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous list response (for list)'),
      subject: z.string().optional().describe('Email subject line (required for create)'),
      body: z.string().optional().describe('HTML email body (required for create)'),
      audience: z
        .enum(['audience', 'customers', 'followers', 'product'])
        .optional()
        .describe(
          'Who receives the email (for create): "audience" for customers and followers (default), "customers", "followers", or "product" for buyers of productId'
        ),
      productId: z
        .string()
        .optional()
        .describe('Product ID or permalink (required for create when audience is "product")'),
      scheduledAt: z
        .string()
        .optional()
        .describe(
          'Publish date and time in the seller\'s Gumroad timezone, such as "2026-07-01 14:00" (required for schedule)'
        )
    })
  )
  .output(
    z.object({
      email: emailSchema
        .optional()
        .describe('The audience email (for every action except list and delete)'),
      emails: z
        .array(emailSchema)
        .optional()
        .describe('Audience emails, newest first (for list)'),
      nextPageKey: z.string().optional().describe('Cursor for the next page of results'),
      previewUrl: z
        .string()
        .optional()
        .describe(
          'Link to view the email: the public post when published, otherwise the editor preview'
        ),
      deleted: z.boolean().optional().describe('Whether the email was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listEmails({
        type: ctx.input.state,
        pageKey: ctx.input.pageKey
      });
      let emails = result.emails.map(mapEmail);

      return {
        output: { emails, nextPageKey: result.nextPageKey },
        message: `Found **${emails.length}** audience email(s).${result.nextPageKey ? ' More results are available with pagination.' : ''}`
      };
    }

    if (action === 'create') {
      let audience = ctx.input.audience ?? 'audience';
      let productId =
        audience === 'product'
          ? requireInput(ctx.input.productId, 'productId', 'create (product audience)')
          : undefined;
      let email = mapEmail(
        await client.createEmail({
          subject: requireInput(ctx.input.subject, 'subject', action),
          body: requireInput(ctx.input.body, 'body', action),
          audience,
          productId
        })
      );

      return {
        output: { email },
        message: `Created draft audience email **${email.subject ?? email.emailId}** (${email.emailId}).`
      };
    }

    let emailId = requireInput(ctx.input.emailId, 'emailId', action);

    if (action === 'get') {
      let email = mapEmail(await client.getEmail(emailId));
      return {
        output: { email },
        message: `Retrieved audience email **${email.subject ?? emailId}** (${email.state ?? 'unknown state'}).`
      };
    }

    if (action === 'send_preview') {
      let result = await client.sendEmailPreview(emailId);
      return {
        output: {
          email: result.email ? mapEmail(result.email) : undefined,
          previewUrl: result.previewUrl
        },
        message: result.message ?? `Sent a preview of audience email ${emailId}.`
      };
    }

    if (action === 'send') {
      let email = mapEmail(await client.sendEmail(emailId));
      return {
        output: { email, previewUrl: email.url },
        message: `Published audience email **${email.subject ?? emailId}**.${email.url ? ` View it at ${email.url}.` : ''}`
      };
    }

    if (action === 'schedule') {
      let email = mapEmail(
        await client.scheduleEmail(
          emailId,
          requireInput(ctx.input.scheduledAt, 'scheduledAt', action)
        )
      );
      return {
        output: { email },
        message: `Scheduled audience email **${email.subject ?? emailId}** for ${email.scheduledAt ?? ctx.input.scheduledAt}.`
      };
    }

    if (action === 'unschedule') {
      let email = mapEmail(await client.unscheduleEmail(emailId));
      return {
        output: { email },
        message: `Unscheduled audience email **${email.subject ?? emailId}**; it is a draft again.`
      };
    }

    if (action === 'delete') {
      await client.deleteEmail(emailId);
      return {
        output: { deleted: true },
        message: `Deleted audience email ${emailId}.`
      };
    }

    throw gumroadServiceError(`Unknown action: ${action}`);
  })
  .build();
