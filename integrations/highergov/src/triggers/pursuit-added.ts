import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pursuitAdded = SlateTrigger.create(spec, {
  name: 'Pursuit Added',
  key: 'pursuit_added',
  description:
    'Triggers when a pursuit is added to a Zapier-linked pipeline in HigherGov. Sends opportunity details to external CRMs. Pursuits can be added from Federal Contract Opportunities, State and Local Opportunities, Forecast Opportunities, DLA/DIBBS Opportunities, Grant Opportunities, IDV Awards, Prime Contract Awards, and Prime Grant Award pages. Requires a Standard or Leader plan subscription.'
})
  .input(
    z.object({
      title: z.string().optional().describe('Opportunity title'),
      description: z.string().optional().describe('Opportunity description'),
      sourceId: z.string().optional().describe('Source-specific identifier'),
      capturedDate: z.string().optional().describe('Date the opportunity was captured'),
      postedDate: z.string().optional().describe('Date the opportunity was posted'),
      dueDate: z.string().optional().describe('Due date for the opportunity'),
      agencyName: z.string().optional().describe('Agency name'),
      agencyAbbreviation: z.string().optional().describe('Agency abbreviation'),
      agencyType: z.string().optional().describe('Agency type'),
      naicsCode: z.string().optional().describe('NAICS code'),
      pscCode: z.string().optional().describe('PSC code'),
      primaryContactName: z.string().optional().describe('Primary contact name'),
      primaryContactTitle: z.string().optional().describe('Primary contact title'),
      primaryContactEmail: z.string().optional().describe('Primary contact email'),
      primaryContactPhone: z.string().optional().describe('Primary contact phone'),
      secondaryContactName: z.string().optional().describe('Secondary contact name'),
      secondaryContactTitle: z.string().optional().describe('Secondary contact title'),
      secondaryContactEmail: z.string().optional().describe('Secondary contact email'),
      secondaryContactPhone: z.string().optional().describe('Secondary contact phone'),
      setAsideType: z.string().optional().describe('Set-aside type'),
      estimatedValue: z.string().optional().describe('Estimated value'),
      userEmail: z.string().optional().describe('Email of the user who added the pursuit'),
      path: z.string().optional().describe('HigherGov internal path reference'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      title: z.string().optional().describe('Opportunity title'),
      description: z.string().optional().describe('Opportunity description'),
      sourceId: z.string().optional().describe('Source-specific identifier'),
      capturedDate: z.string().optional().describe('Date the opportunity was captured'),
      postedDate: z.string().optional().describe('Date the opportunity was posted'),
      dueDate: z.string().optional().describe('Due date for the opportunity'),
      agencyName: z.string().optional().describe('Agency name'),
      agencyAbbreviation: z.string().optional().describe('Agency abbreviation'),
      agencyType: z.string().optional().describe('Agency type'),
      naicsCode: z.string().optional().describe('NAICS code'),
      pscCode: z.string().optional().describe('PSC code'),
      primaryContactName: z.string().optional().describe('Primary contact name'),
      primaryContactTitle: z.string().optional().describe('Primary contact title'),
      primaryContactEmail: z.string().optional().describe('Primary contact email'),
      primaryContactPhone: z.string().optional().describe('Primary contact phone'),
      secondaryContactName: z.string().optional().describe('Secondary contact name'),
      secondaryContactTitle: z.string().optional().describe('Secondary contact title'),
      secondaryContactEmail: z.string().optional().describe('Secondary contact email'),
      secondaryContactPhone: z.string().optional().describe('Secondary contact phone'),
      setAsideType: z.string().optional().describe('Set-aside type'),
      estimatedValue: z.string().optional().describe('Estimated value'),
      userEmail: z.string().optional().describe('Email of the user who added the pursuit'),
      path: z.string().optional().describe('HigherGov path to the opportunity')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      let result = await client.zapierSubscribe(ctx.input.webhookBaseUrl);
      return {
        registrationDetails: result
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      await client.zapierUnsubscribe(ctx.input.webhookBaseUrl);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      // HigherGov sends a single pursuit payload per webhook call
      let payload = data;

      return {
        inputs: [
          {
            title: asString(payload.title),
            description: asString(payload.description),
            sourceId: asString(payload.source_id),
            capturedDate: asString(payload.captured_date),
            postedDate: asString(payload.posted_date),
            dueDate: asString(payload.due_date),
            agencyName: asString(payload.agency_name),
            agencyAbbreviation: asString(payload.agency_abbreviation),
            agencyType: asString(payload.agency_type),
            naicsCode: asString(payload.naics_code),
            pscCode: asString(payload.psc_code),
            primaryContactName: asString(payload.primary_contact_name),
            primaryContactTitle: asString(payload.primary_contact_title),
            primaryContactEmail: asString(payload.primary_contact_email),
            primaryContactPhone: asString(payload.primary_contact_phone),
            secondaryContactName: asString(payload.secondary_contact_name),
            secondaryContactTitle: asString(payload.secondary_contact_title),
            secondaryContactEmail: asString(payload.secondary_contact_email),
            secondaryContactPhone: asString(payload.secondary_contact_phone),
            setAsideType: asString(payload.set_aside_type),
            estimatedValue: asString(payload.estimated_value),
            userEmail: asString(payload.user_email),
            path: asString(payload.path),
            rawPayload: payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId =
        ctx.input.sourceId ||
        ctx.input.path ||
        `${ctx.input.title}-${ctx.input.capturedDate}-${Date.now()}`;

      return {
        type: 'pursuit.added',
        id: eventId,
        output: {
          title: ctx.input.title,
          description: ctx.input.description,
          sourceId: ctx.input.sourceId,
          capturedDate: ctx.input.capturedDate,
          postedDate: ctx.input.postedDate,
          dueDate: ctx.input.dueDate,
          agencyName: ctx.input.agencyName,
          agencyAbbreviation: ctx.input.agencyAbbreviation,
          agencyType: ctx.input.agencyType,
          naicsCode: ctx.input.naicsCode,
          pscCode: ctx.input.pscCode,
          primaryContactName: ctx.input.primaryContactName,
          primaryContactTitle: ctx.input.primaryContactTitle,
          primaryContactEmail: ctx.input.primaryContactEmail,
          primaryContactPhone: ctx.input.primaryContactPhone,
          secondaryContactName: ctx.input.secondaryContactName,
          secondaryContactTitle: ctx.input.secondaryContactTitle,
          secondaryContactEmail: ctx.input.secondaryContactEmail,
          secondaryContactPhone: ctx.input.secondaryContactPhone,
          setAsideType: ctx.input.setAsideType,
          estimatedValue: ctx.input.estimatedValue,
          userEmail: ctx.input.userEmail,
          path: ctx.input.path
        }
      };
    }
  })
  .build();

let asString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return String(value);
};
