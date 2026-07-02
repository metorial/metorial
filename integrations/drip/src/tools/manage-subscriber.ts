import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  description: `Create, update, or fetch a subscriber (contact) in Drip. Use this to add new subscribers, update their profile information, manage tags, set custom fields, and configure GDPR consent. If the email already exists, the subscriber will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z
        .string()
        .describe('The subscriber email address. Required when creating a new subscriber.'),
      newEmail: z
        .string()
        .optional()
        .describe('A new email address to replace the existing one.'),
      firstName: z.string().optional().describe('First name.'),
      lastName: z.string().optional().describe('Last name.'),
      address1: z.string().optional().describe('Street address line 1.'),
      address2: z.string().optional().describe('Street address line 2.'),
      city: z.string().optional().describe('City.'),
      state: z.string().optional().describe('State or province.'),
      zip: z.string().optional().describe('ZIP or postal code.'),
      country: z.string().optional().describe('Country.'),
      phone: z.string().optional().describe('Phone number.'),
      smsNumber: z
        .string()
        .optional()
        .describe('SMS-capable phone number, e.g. +16125551212.'),
      smsConsent: z
        .boolean()
        .optional()
        .describe('Whether the subscriber has given SMS consent.'),
      timeZone: z.string().optional().describe('IANA time zone, e.g. America/Los_Angeles.'),
      ipAddress: z.string().optional().describe('IP address for geolocation.'),
      userId: z.string().optional().describe('A unique user identifier from your system.'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs for custom fields.'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the subscriber.'),
      removeTags: z
        .array(z.string())
        .optional()
        .describe('Tags to remove from the subscriber.'),
      euConsent: z
        .enum(['granted', 'denied', 'unknown'])
        .optional()
        .describe('GDPR consent status.'),
      euConsentMessage: z
        .string()
        .optional()
        .describe('The consent message shown to the subscriber.'),
      status: z.enum(['active', 'unsubscribed']).optional().describe('Subscriber status.'),
      initialStatus: z
        .enum(['active', 'unsubscribed'])
        .optional()
        .describe('Initial status if status should not change.'),
      prospect: z
        .boolean()
        .optional()
        .describe('Whether the subscriber is a prospect for lead scoring.'),
      baseLeadScore: z.number().optional().describe('Base lead score value.')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('The Drip subscriber ID.'),
      email: z.string().describe('The subscriber email address.'),
      firstName: z.string().optional().describe('First name.'),
      lastName: z.string().optional().describe('Last name.'),
      status: z.string().optional().describe('Subscriber status.'),
      timeZone: z.string().optional().describe('Time zone.'),
      lifetimeValue: z.number().optional().describe('Lifetime value in cents.'),
      leadScore: z.number().optional().describe('Current lead score.'),
      tags: z.array(z.string()).optional().describe('Applied tags.'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom fields.'),
      createdAt: z.string().optional().describe('Creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let subscriber: Record<string, any> = {
      email: ctx.input.email
    };

    if (ctx.input.newEmail) subscriber.new_email = ctx.input.newEmail;
    if (ctx.input.firstName) subscriber.first_name = ctx.input.firstName;
    if (ctx.input.lastName) subscriber.last_name = ctx.input.lastName;
    if (ctx.input.address1) subscriber.address1 = ctx.input.address1;
    if (ctx.input.address2) subscriber.address2 = ctx.input.address2;
    if (ctx.input.city) subscriber.city = ctx.input.city;
    if (ctx.input.state) subscriber.state = ctx.input.state;
    if (ctx.input.zip) subscriber.zip = ctx.input.zip;
    if (ctx.input.country) subscriber.country = ctx.input.country;
    if (ctx.input.phone) subscriber.phone = ctx.input.phone;
    if (ctx.input.smsNumber) subscriber.sms_number = ctx.input.smsNumber;
    if (ctx.input.smsConsent !== undefined) subscriber.sms_consent = ctx.input.smsConsent;
    if (ctx.input.timeZone) subscriber.time_zone = ctx.input.timeZone;
    if (ctx.input.ipAddress) subscriber.ip_address = ctx.input.ipAddress;
    if (ctx.input.userId) subscriber.user_id = ctx.input.userId;
    if (ctx.input.customFields) subscriber.custom_fields = ctx.input.customFields;
    if (ctx.input.tags) subscriber.tags = ctx.input.tags;
    if (ctx.input.removeTags) subscriber.remove_tags = ctx.input.removeTags;
    if (ctx.input.euConsent) subscriber.eu_consent = ctx.input.euConsent;
    if (ctx.input.euConsentMessage) subscriber.eu_consent_message = ctx.input.euConsentMessage;
    if (ctx.input.status) subscriber.status = ctx.input.status;
    if (ctx.input.initialStatus) subscriber.initial_status = ctx.input.initialStatus;
    if (ctx.input.prospect !== undefined) subscriber.prospect = ctx.input.prospect;
    if (ctx.input.baseLeadScore !== undefined)
      subscriber.base_lead_score = ctx.input.baseLeadScore;

    let result = await client.createOrUpdateSubscriber(subscriber);
    let sub = result.subscribers?.[0] ?? {};

    return {
      output: {
        subscriberId: sub.id ?? '',
        email: sub.email ?? ctx.input.email,
        firstName: sub.first_name,
        lastName: sub.last_name,
        status: sub.status,
        timeZone: sub.time_zone,
        lifetimeValue: sub.lifetime_value,
        leadScore: sub.lead_score,
        tags: sub.tags,
        customFields: sub.custom_fields,
        createdAt: sub.created_at
      },
      message: `Subscriber **${sub.email ?? ctx.input.email}** has been created/updated successfully.`
    };
  })
  .build();
