import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Fetch a single subscriber's details by their ID, email address, or visitor UUID. Returns full profile data including tags, custom fields, lead score, and lifetime value.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      subscriberIdOrEmail: z
        .string()
        .describe('The subscriber ID, email address, or visitor UUID to look up.')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('The Drip subscriber ID.'),
      email: z.string().describe('Email address.'),
      firstName: z.string().optional().describe('First name.'),
      lastName: z.string().optional().describe('Last name.'),
      status: z.string().optional().describe('Subscriber status (active, unsubscribed, etc).'),
      address1: z.string().optional().describe('Street address line 1.'),
      address2: z.string().optional().describe('Street address line 2.'),
      city: z.string().optional().describe('City.'),
      state: z.string().optional().describe('State.'),
      zip: z.string().optional().describe('ZIP code.'),
      country: z.string().optional().describe('Country.'),
      phone: z.string().optional().describe('Phone number.'),
      smsNumber: z.string().optional().describe('SMS number.'),
      timeZone: z.string().optional().describe('Time zone.'),
      utcOffset: z.number().optional().describe('UTC offset in minutes.'),
      lifetimeValue: z.number().optional().describe('Lifetime value in cents.'),
      leadScore: z.number().optional().describe('Current lead score.'),
      tags: z.array(z.string()).optional().describe('Applied tags.'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom fields.'),
      createdAt: z.string().optional().describe('Creation timestamp.'),
      userId: z.string().optional().describe('Your system identifier for this person.'),
      visitorUuid: z.string().optional().describe('Drip visitor UUID, when available.'),
      deliverable: z
        .boolean()
        .optional()
        .describe(
          'False when Drip has marked the address undeliverable, e.g. after a bounce.'
        ),
      smsConsent: z.boolean().optional().describe('Whether SMS consent was granted.'),
      euConsent: z.string().optional().describe('GDPR consent: granted, denied or unknown.'),
      prospect: z.boolean().optional().describe('Whether the person is marked as a lead.'),
      baseLeadScore: z.number().optional().describe('Starting lead score value.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId ?? ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.fetchSubscriber(ctx.input.subscriberIdOrEmail);
    let sub = result.subscribers?.[0] ?? {};

    return {
      output: {
        subscriberId: sub.id ?? '',
        email: sub.email ?? '',
        firstName: sub.first_name,
        lastName: sub.last_name,
        status: sub.status,
        address1: sub.address1,
        address2: sub.address2,
        city: sub.city,
        state: sub.state,
        zip: sub.zip,
        country: sub.country,
        phone: sub.phone,
        smsNumber: sub.sms_number,
        timeZone: sub.time_zone,
        utcOffset: sub.utc_offset,
        lifetimeValue: sub.lifetime_value,
        leadScore: sub.lead_score,
        tags: sub.tags,
        customFields: sub.custom_fields,
        createdAt: sub.created_at,
        userId: sub.user_id === undefined ? undefined : String(sub.user_id),
        visitorUuid: sub.visitor_uuid,
        deliverable: sub.deliverable,
        smsConsent: sub.sms_consent,
        euConsent: sub.eu_consent,
        prospect: sub.prospect,
        baseLeadScore: sub.base_lead_score
      },
      message: `Fetched subscriber **${sub.email}** (ID: ${sub.id}).`
    };
  })
  .build();
