import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let emailSchema = z.object({
  email: z.string().describe('Email address'),
  emailType: z.string().describe('Type of email (e.g., "work", "personal")'),
  emailStatus: z.string().describe('Verification status (e.g., "valid", "risky", "invalid")')
});

let phoneSchema = z.object({
  phoneNumber: z.string().describe('Phone number'),
  phoneType: z.string().describe('Type of phone (e.g., "mobile")')
});

export let enrichmentCompleted = SlateTrigger.create(spec, {
  name: 'Enrichment Completed',
  key: 'enrichment_completed',
  description:
    'Triggers when an individual contact enrichment request finishes processing (successfully or with failure). Configure this webhook URL in Wiza Settings → API, or pass it as callback_url when starting enrichment requests.'
})
  .input(
    z.object({
      revealId: z.number().describe('ID of the enrichment request.'),
      revealStatus: z.string().describe('Status of the enrichment: "finished" or "failed".'),
      statusCode: z.number().describe('HTTP status code from the webhook payload.'),
      statusMessage: z.string().describe('Status message from the webhook payload.'),
      name: z.string().optional().describe('Full name of the contact.'),
      title: z.string().optional().describe('Job title of the contact.'),
      location: z.string().optional().describe('Location of the contact.'),
      linkedinProfileUrl: z.string().optional().describe('LinkedIn profile URL.'),
      enrichmentLevel: z.string().optional().describe('Enrichment level used.'),
      primaryEmail: z.string().optional().describe('Primary email address.'),
      primaryEmailType: z.string().optional().describe('Type of primary email.'),
      primaryEmailStatus: z
        .string()
        .optional()
        .describe('Verification status of primary email.'),
      emails: z.array(emailSchema).optional().describe('All email addresses found.'),
      primaryPhone: z.string().optional().describe('Primary phone number.'),
      phones: z.array(phoneSchema).optional().describe('All phone numbers found.'),
      companyName: z.string().optional().describe('Company name.'),
      companyDomain: z.string().optional().describe('Company domain.'),
      failError: z.string().optional().describe('Error reason if enrichment failed.')
    })
  )
  .output(
    z.object({
      revealId: z.number().describe('ID of the enrichment request.'),
      revealStatus: z.string().describe('Status of the enrichment: "finished" or "failed".'),
      name: z.string().optional().describe('Full name of the contact.'),
      title: z.string().optional().describe('Job title of the contact.'),
      location: z.string().optional().describe('Location of the contact.'),
      linkedinProfileUrl: z.string().optional().describe('LinkedIn profile URL.'),
      enrichmentLevel: z.string().optional().describe('Enrichment level used.'),
      primaryEmail: z.string().optional().describe('Primary email address.'),
      primaryEmailType: z.string().optional().describe('Type of primary email.'),
      primaryEmailStatus: z
        .string()
        .optional()
        .describe('Verification status of primary email.'),
      emails: z.array(emailSchema).optional().describe('All email addresses found.'),
      primaryPhone: z.string().optional().describe('Primary phone number.'),
      phones: z.array(phoneSchema).optional().describe('All phone numbers found.'),
      companyName: z.string().optional().describe('Company name.'),
      companyDomain: z.string().optional().describe('Company domain.'),
      failError: z.string().optional().describe('Error reason if enrichment failed.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let revealData = data.data || {};
      let status = data.status || {};

      let emails = (revealData.emails as any[] | undefined)?.map((e: any) => ({
        email: e.email,
        emailType: e.email_type,
        emailStatus: e.email_status
      }));

      let phones = (revealData.phones as any[] | undefined)?.map((p: any) => ({
        phoneNumber: p.phone_number,
        phoneType: p.phone_type
      }));

      return {
        inputs: [
          {
            revealId: revealData.id,
            revealStatus: revealData.status,
            statusCode: status.code,
            statusMessage: status.message,
            name: revealData.name,
            title: revealData.title,
            location: revealData.location,
            linkedinProfileUrl: revealData.linkedin_profile_url,
            enrichmentLevel: revealData.enrichment_level,
            primaryEmail: revealData.email,
            primaryEmailType: revealData.email_type,
            primaryEmailStatus: revealData.email_status,
            emails,
            primaryPhone: revealData.mobile_phone || revealData.phone_number,
            phones,
            companyName: revealData.company,
            companyDomain: revealData.company_domain,
            failError: revealData.fail_error
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType =
        ctx.input.revealStatus === 'finished'
          ? 'individual_reveal.finished'
          : 'individual_reveal.failed';

      return {
        type: eventType,
        id: String(ctx.input.revealId),
        output: {
          revealId: ctx.input.revealId,
          revealStatus: ctx.input.revealStatus,
          name: ctx.input.name,
          title: ctx.input.title,
          location: ctx.input.location,
          linkedinProfileUrl: ctx.input.linkedinProfileUrl,
          enrichmentLevel: ctx.input.enrichmentLevel,
          primaryEmail: ctx.input.primaryEmail,
          primaryEmailType: ctx.input.primaryEmailType,
          primaryEmailStatus: ctx.input.primaryEmailStatus,
          emails: ctx.input.emails,
          primaryPhone: ctx.input.primaryPhone,
          phones: ctx.input.phones,
          companyName: ctx.input.companyName,
          companyDomain: ctx.input.companyDomain,
          failError: ctx.input.failError
        }
      };
    }
  })
  .build();
