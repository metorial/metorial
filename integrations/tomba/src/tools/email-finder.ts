import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  uri: z.string().optional().describe('Source URL where the email was found'),
  websiteUrl: z.string().optional().describe('Website URL'),
  extractedOn: z.string().optional().describe('Date when the email was extracted'),
  lastSeenOn: z.string().optional().describe('Date when the email was last seen'),
  stillOnPage: z
    .boolean()
    .optional()
    .describe('Whether the email is still visible on the page')
});

export let emailFinder = SlateTool.create(spec, {
  name: 'Email Finder',
  key: 'email_finder',
  description: `Find the professional email address of a person given their name and a domain or company name. Returns the email address with a confidence score and sources where the email was found online.`,
  instructions: [
    'Provide either a domain or company name. Domain gives better results.',
    'You can provide either a full name or separate first/last name.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().optional().describe('Domain name of the company (e.g. "stripe.com")'),
      company: z.string().optional().describe('Company name (domain is preferred)'),
      fullName: z.string().optional().describe('Full name of the person (e.g. "John Doe")'),
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person')
    })
  )
  .output(
    z.object({
      email: z.string().nullable().optional().describe('Found email address'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      fullName: z.string().nullable().optional().describe('Full name'),
      company: z.string().nullable().optional().describe('Company name'),
      position: z.string().nullable().optional().describe('Job position'),
      country: z.string().nullable().optional().describe('Country'),
      gender: z.string().nullable().optional().describe('Gender'),
      twitter: z.string().nullable().optional().describe('Twitter handle'),
      linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
      score: z.number().nullable().optional().describe('Confidence score (0-100)'),
      websiteUrl: z.string().nullable().optional().describe('Company website URL'),
      sources: z.array(sourceSchema).optional().describe('Sources where the email was found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.emailFinder({
      domain: ctx.input.domain,
      company: ctx.input.company,
      fullName: ctx.input.fullName,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    });

    let data = result.data || {};
    let sources = (data.sources || []).map((s: any) => ({
      uri: s.uri,
      websiteUrl: s.website_url,
      extractedOn: s.extracted_on,
      lastSeenOn: s.last_seen_on,
      stillOnPage: s.still_on_page
    }));

    return {
      output: {
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: data.full_name,
        company: data.company,
        position: data.position,
        country: data.country,
        gender: data.gender,
        twitter: data.twitter,
        linkedin: data.linkedin,
        score: data.score,
        websiteUrl: data.website_url,
        sources
      },
      message: data.email
        ? `Found email **${data.email}** with confidence score **${data.score}**.`
        : `No email found for the given person and domain.`
    };
  })
  .build();
