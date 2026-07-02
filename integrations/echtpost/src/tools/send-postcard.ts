import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  title: z.string().optional().describe('Title or salutation, e.g. "Prof.", "Dr."'),
  companyName: z.string().optional().describe('Company name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name / surname'),
  street: z.string().describe('Street address'),
  zip: z.string().describe('ZIP / postal code'),
  city: z.string().describe('City'),
  countryCode: z.string().optional().describe('Two-letter country code, e.g. "DE"')
});

export let sendPostcard = SlateTool.create(spec, {
  name: 'Send Postcard',
  key: 'send_postcard',
  description: `Schedule a real physical postcard for delivery using a pre-designed template. Recipients can be specified inline with address details, by referencing existing contact IDs, or by targeting an entire recipient group. Optional email notifications can be configured to alert before or after sending.`,
  instructions: [
    'A template must be created in the EchtPost web interface before using this tool.',
    'Provide recipients using exactly one method: inline contacts, existing contact IDs, or a group ID.',
    'The deliver_at date should be in YYYY-MM-DD format.'
  ],
  constraints: [
    'Postcard text cannot be customized via the API — it is defined in the template.',
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
      deliverAt: z.string().describe('Scheduled delivery date in YYYY-MM-DD format'),
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

    let params: any = {
      template_id: ctx.input.templateId,
      deliver_at: ctx.input.deliverAt
    };

    if (ctx.input.contacts && ctx.input.contacts.length > 0) {
      params.contacts_attributes = ctx.input.contacts.map(c => ({
        title: c.title,
        company_name: c.companyName,
        first: c.firstName,
        name: c.lastName,
        street: c.street,
        zip: c.zip,
        city: c.city,
        country_code: c.countryCode
      }));
    } else if (ctx.input.contactIds && ctx.input.contactIds.length > 0) {
      if (ctx.input.contactIds.length === 1) {
        params.contact_id = ctx.input.contactIds[0];
      } else {
        params.contact_ids = ctx.input.contactIds;
      }
    } else if (ctx.input.groupId) {
      params.group_id = ctx.input.groupId;
    }

    if (ctx.input.notificationType) {
      params.notification_type = ctx.input.notificationType;
    }
    if (ctx.input.notificationDate) {
      params.notification_date = ctx.input.notificationDate;
    }
    if (ctx.input.notificationEmail) {
      params.notification_email = ctx.input.notificationEmail;
    }

    ctx.info({
      message: 'Scheduling postcard for delivery',
      templateId: ctx.input.templateId,
      deliverAt: ctx.input.deliverAt
    });

    let result = await client.createCard(params);

    let cardId = result?.id?.toString();

    return {
      output: {
        cardId,
        status: result?.status,
        response: result
      },
      message: `Postcard scheduled for delivery on **${ctx.input.deliverAt}** using template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
