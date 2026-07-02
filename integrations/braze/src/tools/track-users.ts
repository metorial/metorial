import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

let userAliasSchema = z.object({
  aliasName: z.string().describe('Alias name'),
  aliasLabel: z.string().describe('Alias label')
});

let userIdentifierSchema = z.object({
  externalId: z.string().optional().describe('External user ID'),
  brazeId: z.string().optional().describe('Braze internal user ID'),
  userAlias: userAliasSchema.optional().describe('User alias object'),
  email: z.string().optional().describe('User email address'),
  phone: z.string().optional().describe('User phone number')
});

let attributeSchema = userIdentifierSchema.extend({
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  gender: z.string().optional().describe('Gender (M, F, O, N, P)'),
  dateOfBirth: z.string().optional().describe('Date of birth in YYYY-MM-DD format'),
  country: z.string().optional().describe('Country code (ISO-3166-1 alpha-2)'),
  homeCity: z.string().optional().describe('Home city'),
  language: z.string().optional().describe('Language (ISO-639-1)'),
  timezone: z.string().optional().describe('IANA timezone (e.g. America/New_York)'),
  pushSubscribe: z
    .enum(['opted_in', 'subscribed', 'unsubscribed'])
    .optional()
    .describe('Push notification subscription status'),
  emailSubscribe: z
    .enum(['opted_in', 'subscribed', 'unsubscribed'])
    .optional()
    .describe('Email subscription status'),
  customAttributes: z
    .record(z.string(), z.any())
    .optional()
    .describe('Key-value pairs of custom attributes to set on the user profile')
});

let eventSchema = userIdentifierSchema.extend({
  name: z.string().describe('Name of the custom event'),
  time: z.string().describe('ISO 8601 timestamp of the event'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom properties for the event')
});

let purchaseSchema = userIdentifierSchema.extend({
  productId: z.string().describe('Identifier for the purchased product'),
  currency: z.string().describe('ISO 4217 currency code (e.g. USD)'),
  price: z.number().describe('Price of the purchase'),
  quantity: z.number().optional().describe('Quantity purchased (defaults to 1)'),
  time: z.string().describe('ISO 8601 timestamp of the purchase'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom properties for the purchase')
});

export let trackUsers = SlateTool.create(spec, {
  name: 'Track Users',
  key: 'track_users',
  description: `Record user attributes, custom events, and purchases to Braze user profiles. Supports batch operations with up to 75 attributes, 75 events, and 75 purchases per call. Users are identified by external ID, Braze ID, user alias, email, or phone.`,
  instructions: [
    'At least one of attributes, events, or purchases must be provided.',
    'Each user object must include at least one identifier (externalId, brazeId, userAlias, email, or phone).',
    'Custom attributes are merged with existing data. Set a custom attribute to null to remove it.'
  ],
  constraints: [
    'Maximum 75 attributes, 75 events, and 75 purchases per request (225 total user updates).',
    'Rate limited to 3,000 requests per 3 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      attributes: z
        .array(attributeSchema)
        .optional()
        .describe('User profile attributes to set or update'),
      events: z.array(eventSchema).optional().describe('Custom events to log'),
      purchases: z.array(purchaseSchema).optional().describe('Purchase events to log')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Response status from Braze'),
      attributesProcessed: z.number().optional().describe('Number of attributes processed'),
      eventsProcessed: z.number().optional().describe('Number of events processed'),
      purchasesProcessed: z.number().optional().describe('Number of purchases processed'),
      errors: z
        .array(z.any())
        .optional()
        .describe('Non-fatal errors encountered during processing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let body: {
      attributes?: Record<string, any>[];
      events?: Record<string, any>[];
      purchases?: Record<string, any>[];
    } = {};

    if (ctx.input.attributes) {
      body.attributes = ctx.input.attributes.map(attr => {
        let mapped: Record<string, any> = {};
        if (attr.externalId) mapped.external_id = attr.externalId;
        if (attr.brazeId) mapped.braze_id = attr.brazeId;
        if (attr.userAlias)
          mapped.user_alias = {
            alias_name: attr.userAlias.aliasName,
            alias_label: attr.userAlias.aliasLabel
          };
        if (attr.email) mapped.email = attr.email;
        if (attr.phone) mapped.phone = attr.phone;
        if (attr.firstName) mapped.first_name = attr.firstName;
        if (attr.lastName) mapped.last_name = attr.lastName;
        if (attr.gender) mapped.gender = attr.gender;
        if (attr.dateOfBirth) mapped.dob = attr.dateOfBirth;
        if (attr.country) mapped.country = attr.country;
        if (attr.homeCity) mapped.home_city = attr.homeCity;
        if (attr.language) mapped.language = attr.language;
        if (attr.timezone) mapped.time_zone = attr.timezone;
        if (attr.pushSubscribe) mapped.push_subscribe = attr.pushSubscribe;
        if (attr.emailSubscribe) mapped.email_subscribe = attr.emailSubscribe;
        if (attr.customAttributes) {
          for (let [key, value] of Object.entries(attr.customAttributes)) {
            mapped[key] = value;
          }
        }
        return mapped;
      });
    }

    if (ctx.input.events) {
      body.events = ctx.input.events.map(evt => {
        let mapped: Record<string, any> = { name: evt.name, time: evt.time };
        if (evt.externalId) mapped.external_id = evt.externalId;
        if (evt.brazeId) mapped.braze_id = evt.brazeId;
        if (evt.userAlias)
          mapped.user_alias = {
            alias_name: evt.userAlias.aliasName,
            alias_label: evt.userAlias.aliasLabel
          };
        if (evt.email) mapped.email = evt.email;
        if (evt.phone) mapped.phone = evt.phone;
        if (evt.properties) mapped.properties = evt.properties;
        return mapped;
      });
    }

    if (ctx.input.purchases) {
      body.purchases = ctx.input.purchases.map(p => {
        let mapped: Record<string, any> = {
          product_id: p.productId,
          currency: p.currency,
          price: p.price,
          time: p.time
        };
        if (p.externalId) mapped.external_id = p.externalId;
        if (p.brazeId) mapped.braze_id = p.brazeId;
        if (p.userAlias)
          mapped.user_alias = {
            alias_name: p.userAlias.aliasName,
            alias_label: p.userAlias.aliasLabel
          };
        if (p.email) mapped.email = p.email;
        if (p.phone) mapped.phone = p.phone;
        if (p.quantity !== undefined) mapped.quantity = p.quantity;
        if (p.properties) mapped.properties = p.properties;
        return mapped;
      });
    }

    let result = await client.trackUsers(body);

    let counts: any[] = [];
    if (ctx.input.attributes?.length)
      counts.push(`${result.attributes_processed ?? ctx.input.attributes.length} attributes`);
    if (ctx.input.events?.length)
      counts.push(`${result.events_processed ?? ctx.input.events.length} events`);
    if (ctx.input.purchases?.length)
      counts.push(`${result.purchases_processed ?? ctx.input.purchases.length} purchases`);

    return {
      output: {
        message: result.message,
        attributesProcessed: result.attributes_processed,
        eventsProcessed: result.events_processed,
        purchasesProcessed: result.purchases_processed,
        errors: result.errors
      },
      message: `Tracked ${counts.join(', ')} successfully.${result.errors?.length ? ` ${result.errors.length} non-fatal error(s) occurred.` : ''}`
    };
  })
  .build();
