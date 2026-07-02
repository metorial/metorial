import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSubscriber = SlateTool.create(spec, {
  name: 'Update Subscriber',
  key: 'update_subscriber',
  description: `Updates an existing subscriber's information in Sender. You can modify their name, phone, group assignments, custom fields, and subscription statuses. Identify the subscriber by their email, phone, or subscriber ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe(
          'Subscriber email, phone number, or subscriber ID used to identify the subscriber'
        ),
      firstname: z.string().optional().describe('Updated first name'),
      lastname: z.string().optional().describe('Updated last name'),
      phone: z.string().optional().describe('Updated phone number including country code'),
      groupIds: z
        .array(z.string())
        .optional()
        .describe('Updated array of group IDs to assign'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom field key-value pairs'),
      subscriberStatus: z
        .enum(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'SPAM_REPORTED'])
        .optional()
        .describe('Updated email subscription status'),
      smsStatus: z
        .enum(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'SPAM_REPORTED'])
        .optional()
        .describe('Updated SMS subscription status'),
      transactionalEmailStatus: z
        .enum(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'SPAM_REPORTED'])
        .optional()
        .describe('Updated transactional email status'),
      triggerAutomation: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to trigger automation workflows')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.firstname !== undefined) updateData.firstname = ctx.input.firstname;
    if (ctx.input.lastname !== undefined) updateData.lastname = ctx.input.lastname;
    if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
    if (ctx.input.groupIds !== undefined) updateData.groups = ctx.input.groupIds;
    if (ctx.input.customFields !== undefined) updateData.fields = ctx.input.customFields;
    if (ctx.input.subscriberStatus !== undefined)
      updateData.subscriber_status = ctx.input.subscriberStatus;
    if (ctx.input.smsStatus !== undefined) updateData.sms_status = ctx.input.smsStatus;
    if (ctx.input.transactionalEmailStatus !== undefined)
      updateData.transactional_email_status = ctx.input.transactionalEmailStatus;
    if (ctx.input.triggerAutomation !== undefined)
      updateData.trigger_automation = ctx.input.triggerAutomation;

    let result = await client.updateSubscriber(ctx.input.identifier, updateData);

    return {
      output: {
        success: result.success
      },
      message: `Subscriber **${ctx.input.identifier}** updated successfully.`
    };
  })
  .build();
