import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  contactBody,
  inputId,
  type ProviderRecord,
  requiredText
} from '../lib/client';
import { mapCard } from '../lib/schemas';
import { spec } from '../spec';

let contactSchema = z.object({
  title: z.string().optional().describe('Title or salutation, e.g. "Prof.", "Dr."'),
  companyName: z.string().optional().describe('Company name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name / surname'),
  street: z.string().describe('Street address'),
  zip: z.string().describe('ZIP / postal code'),
  city: z.string().describe('City'),
  countryCode: z
    .string()
    .optional()
    .describe('Two-letter country code, e.g. "DE"; required for each inline recipient')
});

export let sendPostcard = SlateTool.create(spec, {
  name: 'Send Postcard',
  key: 'send_postcard',
  description: `Schedule a real physical postcard for delivery using a pre-designed template. Recipients can be specified inline with address details, by referencing existing contact IDs, or by targeting an entire recipient group. Optional email notifications can be configured to alert before or after sending.`,
  instructions: [
    'A template must be created in the EchtPost web interface before using this tool.',
    'Provide at least one recipient using inline contacts, existing contact IDs, a group ID, or a combination.',
    'Each inline recipient needs lastName, street, zip, city, and countryCode.',
    'deliverAt accepts YYYY-MM-DD, today, asap, tomorrow, or N-days-from-now; it must resolve to an available printing weekday within 90 days.'
  ],
  constraints: [
    'This tool uses the text and design saved in the template.',
    'Requires sufficient prepaid account balance; returns an error if balance is insufficient.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the pre-designed postcard template'),
      deliverAt: z
        .string()
        .describe(
          'Scheduled printing date: YYYY-MM-DD, today, asap, tomorrow, or N-days-from-now'
        ),
      contacts: z
        .array(contactSchema)
        .optional()
        .describe('Inline recipient contacts with address details'),
      contactIds: z
        .array(z.string())
        .optional()
        .describe('IDs of existing contacts to send to'),
      groupId: z.string().optional().describe('ID of a recipient group to send to'),
      notificationType: z
        .enum(['before_send', 'after_send'])
        .optional()
        .describe('When to send email notification'),
      notificationDate: z
        .string()
        .optional()
        .describe('Date for the notification in YYYY-MM-DD format'),
      notificationEmail: z
        .string()
        .optional()
        .describe('Email address to send notification to')
    })
  )
  .output(
    z.object({
      cardId: z.string().optional().describe('ID of the created postcard'),
      status: z.string().optional().describe('Status of the postcard'),
      response: z.any().describe('Full response from the EchtPost API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: ProviderRecord = {
      template_id: inputId(ctx.input.templateId, 'templateId'),
      deliver_at: requiredText(ctx.input.deliverAt, 'deliverAt')
    };

    if (
      !ctx.input.contacts?.length &&
      !ctx.input.contactIds?.length &&
      ctx.input.groupId === undefined
    ) {
      throw createApiServiceError('Provide at least one contact, contact ID, or group ID.');
    }
    if (ctx.input.contacts !== undefined) {
      if (!ctx.input.contacts.length)
        throw createApiServiceError('contacts must not be empty when provided.');
      params.recipients = ctx.input.contacts.map(c => contactBody(c));
    }
    if (ctx.input.contactIds !== undefined) {
      if (!ctx.input.contactIds.length)
        throw createApiServiceError('contactIds must not be empty when provided.');
      params.recipient_ids = ctx.input.contactIds.map(value => inputId(value, 'contactIds'));
    }
    if (ctx.input.groupId !== undefined) {
      params.group_ids = [inputId(ctx.input.groupId, 'groupId')];
    }

    if (
      ctx.input.notificationType === undefined &&
      (ctx.input.notificationDate !== undefined || ctx.input.notificationEmail !== undefined)
    ) {
      throw createApiServiceError(
        'Provide notificationType when supplying a notification date or email.'
      );
    }
    if (ctx.input.notificationType !== undefined) {
      let email = requiredText(ctx.input.notificationEmail, 'notificationEmail');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw createApiServiceError('Provide a valid notificationEmail.');
      }
      params.notifications = [
        pickDefined({
          type: ctx.input.notificationType === 'after_send' ? 'after_sent' : 'before_send',
          email,
          send_on: ctx.input.notificationDate
        })
      ];
    }

    ctx.info({
      message: 'Scheduling postcard for delivery',
      templateId: ctx.input.templateId,
      deliverAt: ctx.input.deliverAt
    });

    let result = await client.save('POST', '/cards/from_template', params);
    let card = mapCard(result);

    return {
      output: {
        cardId: card.cardId,
        status: card.status,
        response: result
      },
      message: `Postcard scheduled for delivery on **${ctx.input.deliverAt}** using template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
