import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  email: z.string().describe('The email address'),
  qualification: z.string().describe('Email qualification (e.g. "nominative@pro")')
});

let enrichedContactSchema = z.object({
  civility: z.string().optional().describe('Civility (e.g. Mr, Mrs)'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  fullName: z.string().optional().describe('Full name'),
  emails: z.array(emailResultSchema).optional().describe('Qualified email addresses'),
  phone: z.string().optional().describe('Phone number'),
  mobilePhone: z.string().optional().describe('Mobile phone number'),
  company: z.string().optional().describe('Company name'),
  website: z.string().optional().describe('Company website'),
  linkedinUrl: z.string().optional().describe('Personal LinkedIn URL'),
  companyLinkedinUrl: z.string().optional().describe('Company LinkedIn URL'),
  siren: z.string().optional().describe('SIREN number'),
  siret: z.string().optional().describe('SIRET number'),
  siretAddress: z.string().optional().describe('SIRET registered address'),
  siretZip: z.string().optional().describe('SIRET zip code'),
  siretCity: z.string().optional().describe('SIRET city'),
  vat: z.string().optional().describe('VAT number'),
  nbEmployees: z.string().optional().describe('Number of employees'),
  naf5Code: z.string().optional().describe('NAF code'),
  naf5Description: z.string().optional().describe('NAF code description'),
  country: z.string().optional().describe('Country'),
  companyTurnover: z.string().optional().describe('Company turnover'),
  companyResults: z.string().optional().describe('Company results'),
  jobTitle: z.string().optional().describe('Job title'),
  jobLevel: z.string().optional().describe('Job level'),
  jobFunction: z.string().optional().describe('Job function'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom fields from the original request')
});

export let enrichmentResult = SlateTrigger.create(spec, {
  name: 'Enrichment Result Ready',
  key: 'enrichment_result',
  description:
    'Triggers when a contact enrichment request has been processed and results are ready. Receives the enriched contact data via webhook.'
})
  .input(
    z.object({
      webhookEventId: z.string().describe('Unique ID of the webhook event'),
      requestId: z.string().describe('Original enrichment request ID'),
      eventType: z.string().describe('Type of event (enrich_api_result)'),
      occurredAt: z.number().describe('Timestamp when the event occurred'),
      contacts: z
        .array(z.any())
        .describe('Array of enriched contact data from webhook payload')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Original enrichment request ID'),
      contacts: z.array(enrichedContactSchema).describe('Array of enriched contact data'),
      contactCount: z.number().describe('Number of contacts in this result'),
      occurredAt: z.string().describe('ISO timestamp when the enrichment completed')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.setDefaultWebhookUrl(ctx.input.webhookBaseUrl);
      return {
        registrationDetails: {
          callbackUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteDefaultWebhookUrl();
    },

    handleRequest: async ctx => {
      let body = await ctx.input.request.json();

      // Dropcontact sends an array of webhook events
      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events.map(event => ({
        webhookEventId: event.id || `${event.data?.request_id}_${event.occurred_at}`,
        requestId: event.data?.request_id || '',
        eventType: event.event_type || 'enrich_api_result',
        occurredAt: event.occurred_at || 0,
        contacts: event.data?.data || []
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let contacts = (ctx.input.contacts || []).map((c: any) => ({
        civility: c.civility,
        firstName: c.first_name,
        lastName: c.last_name,
        fullName: c.full_name,
        emails: c.email,
        phone: c.phone,
        mobilePhone: c.mobile_phone,
        company: c.company,
        website: c.website,
        linkedinUrl: c.linkedin,
        companyLinkedinUrl: c.company_linkedin,
        siren: c.siren,
        siret: c.siret,
        siretAddress: c.siret_address,
        siretZip: c.siret_zip,
        siretCity: c.siret_city,
        vat: c.vat,
        nbEmployees: c.nb_employees,
        naf5Code: c.naf5_code,
        naf5Description: c.naf5_des,
        country: c.country,
        companyTurnover: c.company_turnover,
        companyResults: c.company_results,
        jobTitle: c.job,
        jobLevel: c.job_level,
        jobFunction: c.job_function,
        customFields: c.custom_fields
      }));

      let occurredAtStr = ctx.input.occurredAt
        ? new Date(ctx.input.occurredAt * 1000).toISOString()
        : new Date().toISOString();

      return {
        type: 'enrichment.completed',
        id: ctx.input.webhookEventId,
        output: {
          requestId: ctx.input.requestId,
          contacts,
          contactCount: contacts.length,
          occurredAt: occurredAtStr
        }
      };
    }
  })
  .build();
