import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, subscriberDetails } from '../lib/client';
import { spec } from '../spec';

export let createSubscriber = SlateTool.create(spec, {
  name: 'Create Subscriber',
  key: 'create_subscriber',
  description: `Creates a new subscriber or updates an existing one in Sender. Allows setting subscriber details, assigning them to groups, and populating custom fields. If a subscriber with the given email already exists, their data will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber'),
      firstname: z.string().optional().describe('First name of the subscriber'),
      lastname: z.string().optional().describe('Last name of the subscriber'),
      phone: z
        .string()
        .optional()
        .describe('Phone number including country code (e.g., +1234567890)'),
      groupIds: z
        .array(z.string())
        .optional()
        .describe('Array of group IDs to assign the subscriber to'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom field key-value pairs. Call list_fields for fieldName keys, such as {$company}.'
        ),
      triggerAutomation: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to trigger automation workflows upon creation')
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
      email: z.string().describe('Email address of the subscriber'),
      firstname: z.string().nullable().describe('First name'),
      lastname: z.string().nullable().describe('Last name'),
      phone: z.string().nullable().describe('Phone number'),
      subscriberStatus: z.string().describe('Email subscription status'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSubscriber({
      email: ctx.input.email,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      phone: ctx.input.phone,
      groups: ctx.input.groupIds,
      fields: ctx.input.customFields,
      trigger_automation: ctx.input.triggerAutomation
    });

    let subscriber = result.data;

    return {
      output: {
        ...subscriberDetails(subscriber)
      },
      message: `Subscriber **${subscriber.email}** created successfully with ID \`${subscriber.id}\`.`
    };
  })
  .build();
