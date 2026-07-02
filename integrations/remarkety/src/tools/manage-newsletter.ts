import { SlateTool } from 'slates';
import { z } from 'zod';
import { RemarketyClient, toSnakeCase } from '../lib/client';
import { spec } from '../spec';

export let manageNewsletterTool = SlateTool.create(spec, {
  name: 'Manage Newsletter Subscription',
  key: 'manage_newsletter',
  description: `Subscribe or unsubscribe a contact from the Remarkety newsletter. Subscription supports double opt-in and can include both email and SMS phone number. Unsubscribing adds the contact to a suppression list that persists even if future updates set accepts_marketing to true.`,
  instructions: [
    'SMS phone numbers must be in E.164 format (e.g., +15417540000).',
    'To resubscribe after an unsubscribe, you must explicitly send a subscribe event.',
    'Unsubscribe adds to a persistent suppression list.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['subscribe', 'unsubscribe'])
        .describe('Whether to subscribe or unsubscribe the contact'),
      email: z.string().describe('Contact email address'),
      smsPhoneNumber: z.string().optional().describe('SMS phone number in E.164 format'),
      doubleOptin: z
        .boolean()
        .optional()
        .describe('Enable double opt-in for the subscription (subscribe only)'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the contact'),
      acceptsSmsMarketing: z
        .boolean()
        .optional()
        .describe('Whether the contact accepts SMS marketing')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was sent successfully'),
      eventType: z.string().describe('The event type that was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemarketyClient({
      token: ctx.auth.token,
      storeId: ctx.auth.storeId,
      storeDomain: ctx.config.storeDomain,
      platform: ctx.config.platform
    });

    let { action, ...contactData } = ctx.input;
    let payload = toSnakeCase(contactData as unknown as Record<string, unknown>);
    let eventType: string;

    if (action === 'subscribe') {
      eventType = 'newsletter/subscribe';
      await client.subscribeNewsletter(payload);
    } else {
      eventType = 'newsletter/unsubscribe';
      await client.unsubscribeContact(payload);
    }

    ctx.info(`Sent ${eventType} event for ${ctx.input.email}`);

    return {
      output: {
        success: true,
        eventType
      },
      message: `Successfully **${action === 'subscribe' ? 'subscribed' : 'unsubscribed'}** contact **${ctx.input.email}**.`
    };
  })
  .build();
