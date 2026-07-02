import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailSchema = z.object({
  email: z.string().describe('Email address'),
  status: z
    .enum(['DELIVERABLE', 'HIGH_PROBABILITY', 'CATCH_ALL', 'INVALID'])
    .optional()
    .describe('Verification status')
});

let phoneSchema = z.object({
  number: z.string().describe('Phone number'),
  region: z.string().optional().describe('ISO region code')
});

let socialMediaSchema = z.object({
  url: z.string().describe('Social media profile URL'),
  type: z.string().optional().describe('Platform type (LINKEDIN, TWITTER, etc.)')
});

let contactResultSchema = z.object({
  custom: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom tracking fields provided in the original request'),
  contact: z
    .object({
      firstname: z.string().optional(),
      lastname: z.string().optional(),
      domain: z.string().optional(),
      mostProbableEmail: z.string().optional().describe('Best email match found'),
      mostProbableEmailStatus: z
        .string()
        .optional()
        .describe('Verification status of the best email'),
      mostProbablePhone: z.string().optional().describe('Best phone number found'),
      emails: z.array(emailSchema).optional().describe('All emails found'),
      phones: z.array(phoneSchema).optional().describe('All phone numbers found'),
      socialMedias: z.array(socialMediaSchema).optional().describe('Social media profiles'),
      profile: z.any().optional().describe('LinkedIn profile and employment data')
    })
    .optional()
});

export let getEnrichmentResult = SlateTool.create(spec, {
  name: 'Get Enrichment Result',
  key: 'get_enrichment_result',
  description: `Retrieve the results of a previously started contact enrichment batch. Returns the enrichment status, all found contact data (emails, phones, social profiles), and credit cost.

Use the enrichment ID returned from **Enrich Contacts** to fetch results. If the enrichment is still in progress, use \`forceResults\` to get partial results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      enrichmentId: z
        .string()
        .describe('The enrichment ID returned from the enrich contacts request'),
      forceResults: z
        .boolean()
        .optional()
        .describe('If true, returns partial results even if enrichment is still in progress')
    })
  )
  .output(
    z.object({
      enrichmentId: z.string().describe('Enrichment batch ID'),
      name: z.string().optional().describe('Batch name'),
      status: z
        .enum([
          'CREATED',
          'IN_PROGRESS',
          'CANCELED',
          'CREDITS_INSUFFICIENT',
          'FINISHED',
          'RATE_LIMIT',
          'UNKNOWN'
        ])
        .describe('Current enrichment status'),
      contacts: z.array(contactResultSchema).describe('Enriched contact results'),
      creditsUsed: z.number().optional().describe('Credits consumed by this enrichment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getEnrichmentResult(
      ctx.input.enrichmentId,
      ctx.input.forceResults
    );

    let contacts = (result.datas ?? []).map((entry: any) => ({
      custom: entry.custom,
      contact: entry.contact
        ? {
            firstname: entry.contact.firstname,
            lastname: entry.contact.lastname,
            domain: entry.contact.domain,
            mostProbableEmail: entry.contact.most_probable_email,
            mostProbableEmailStatus: entry.contact.most_probable_email_status,
            mostProbablePhone: entry.contact.most_probable_phone,
            emails: entry.contact.emails,
            phones: entry.contact.phones,
            socialMedias: entry.contact.social_medias,
            profile: entry.contact.profile
          }
        : undefined
    }));

    let output = {
      enrichmentId: result.id,
      name: result.name,
      status: result.status,
      contacts,
      creditsUsed: result.cost?.credits
    };

    let emailsFound = contacts.filter((c: any) => c.contact?.mostProbableEmail).length;
    let phonesFound = contacts.filter((c: any) => c.contact?.mostProbablePhone).length;

    return {
      output,
      message: `Enrichment **"${result.name}"** — Status: **${result.status}**. ${contacts.length} contact(s) processed. ${emailsFound} email(s) and ${phonesFound} phone(s) found. Credits used: ${result.cost?.credits ?? 0}.`
    };
  })
  .build();
