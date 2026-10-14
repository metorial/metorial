import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, subscriberDetails } from '../lib/client';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Retrieves detailed information about a specific subscriber. Look up by email address, phone number, or subscriber ID. Returns subscriber profile data, subscription statuses, group memberships, and custom field values.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe('Subscriber email address, phone number, or subscriber ID')
    })
  )
  .output(
    z.object({
      subscriberId: z
        .number()
        .optional()
        .describe('Legacy numeric subscriber ID, when returned by Sender'),
      subscriberKey: z
        .string()
        .describe(
          'Subscriber ID. Pass this value to get_subscriber or update_subscriber as identifier'
        ),
      email: z.string().describe('Email address'),
      firstname: z.string().nullable().describe('First name'),
      lastname: z.string().nullable().describe('Last name'),
      phone: z.string().nullable().describe('Phone number'),
      subscriberStatus: z.string().describe('Email subscription status'),
      smsStatus: z
        .string()
        .optional()
        .describe('SMS subscription status, when returned by Sender'),
      transactionalEmailStatus: z.string().describe('Transactional email status'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            title: z.string().describe('Group title')
          })
        )
        .describe('Groups the subscriber belongs to'),
      customFields: z.record(z.string(), z.string()).describe('Custom field values'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSubscriber(ctx.input.identifier);
    let subscriber = result.data;

    return {
      output: {
        ...subscriberDetails(subscriber),
        groups: (subscriber.subscriber_tags || []).map(tag => ({
          groupId: tag.id,
          title: tag.title
        })),
        customFields: Array.isArray(subscriber.columns)
          ? Object.fromEntries(
              subscriber.columns.map(field => [
                field.field_name ?? field.id,
                String(field.value ?? '')
              ])
            )
          : (subscriber.columns ?? {}),
        createdAt: subscriber.created
      },
      message: `Retrieved subscriber **${subscriber.email}** (ID: \`${subscriber.id}\`, status: ${subscriberDetails(subscriber).subscriberStatus}).`
    };
  })
  .build();
