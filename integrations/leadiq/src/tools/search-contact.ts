import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailSchema = z
  .object({
    value: z.string().optional().describe('Email address'),
    type: z.string().optional().describe('Email type (e.g., WorkEmail, PersonalEmail)'),
    status: z
      .string()
      .optional()
      .describe(
        'Verification status (Verified, VerifiedLikely, Unverified, Invalid, Suppressed)'
      ),
    updatedAt: z.string().optional().describe('Last updated timestamp')
  })
  .passthrough();

let phoneSchema = z
  .object({
    value: z.string().optional().describe('Phone number'),
    type: z
      .string()
      .optional()
      .describe('Phone type (e.g., WorkPhone, PersonalMobile, WorkHQ)'),
    status: z.string().optional().describe('Verification status'),
    updatedAt: z.string().optional().describe('Last updated timestamp')
  })
  .passthrough();

let companyInfoSchema = z
  .object({
    companyId: z.string().optional().describe('Company ID'),
    name: z.string().optional().describe('Company name'),
    domain: z.string().optional().describe('Company domain'),
    industry: z.string().optional().describe('Company industry')
  })
  .passthrough();

let positionSchema = z
  .object({
    companyId: z.string().optional().describe('Company ID'),
    title: z.string().optional().describe('Job title'),
    dateRange: z
      .object({
        start: z.string().optional(),
        end: z.string().optional()
      })
      .optional()
      .describe('Date range of the position'),
    updatedAt: z.string().optional(),
    emails: z.array(emailSchema).optional().describe('Work emails for this position'),
    phones: z.array(phoneSchema).optional().describe('Work phones for this position'),
    companyInfo: companyInfoSchema.optional().describe('Company information')
  })
  .passthrough();

let personResultSchema = z
  .object({
    personId: z.string().optional().describe('LeadIQ person ID'),
    name: z
      .object({
        first: z.string().optional(),
        middle: z.string().optional(),
        last: z.string().optional(),
        fullName: z.string().optional()
      })
      .optional()
      .describe('Person name'),
    linkedin: z
      .object({
        linkedinId: z.string().optional(),
        linkedinUrl: z.string().optional()
      })
      .optional()
      .describe('LinkedIn profile'),
    personalEmails: z.array(emailSchema).optional().describe('Personal email addresses'),
    personalPhones: z.array(phoneSchema).optional().describe('Personal phone numbers'),
    currentPositions: z.array(positionSchema).optional().describe('Current job positions'),
    pastPositions: z.array(positionSchema).optional().describe('Past job positions')
  })
  .passthrough();

export let searchContact = SlateTool.create(spec, {
  name: 'Search Contact',
  key: 'search_contact',
  description: `Find a person's professional contact information including verified email addresses, phone numbers, job positions, and LinkedIn profile.
Search by **name and company**, **LinkedIn profile URL/ID**, **email address**, or **phone number**.
Returns current and past positions with associated work emails and phones, personal contact info, and verification statuses.`,
  instructions: [
    'Provide at least one identifying input such as name + company, LinkedIn URL, or email.',
    'Use profileFilter to narrow results to contacts with specific types of contact info (e.g., HasVerifiedWorkEmail).',
    'Use minConfidence (0-100) to filter by match confidence level.'
  ],
  constraints: [
    'Each search call consumes API credits.',
    'Rate limits: 10 requests/minute (free), 60 requests/minute (paid).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      fullName: z
        .string()
        .optional()
        .describe('Full name of the person (alternative to first/last)'),
      companyName: z.string().optional().describe('Current or past company name'),
      companyDomain: z
        .string()
        .optional()
        .describe('Current or past company domain (e.g., acme.com)'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      linkedinId: z.string().optional().describe('LinkedIn profile ID'),
      email: z.string().optional().describe('Work or personal email address'),
      hashedEmail: z.string().optional().describe('SHA256 hashed email address'),
      phone: z.string().optional().describe('Phone number'),
      searchInPastCompanies: z
        .boolean()
        .optional()
        .describe('Whether the company fields should match past companies too'),
      profileFilter: z
        .array(
          z.enum([
            'HasWorkEmail',
            'HasWorkPhone',
            'HasVerifiedWorkEmail',
            'HasVerifiedWorkPhone',
            'HasPersonalEmail',
            'HasPersonalPhone'
          ])
        )
        .optional()
        .describe('Filter results by available contact info types'),
      qualityFilter: z
        .enum(['AllPhones', 'HigherQualityPhones', 'HighestQualityPhones'])
        .optional()
        .describe('Phone number quality level filter'),
      minConfidence: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Minimum match confidence score (0-100)')
    })
  )
  .output(
    z.object({
      totalResults: z.number().optional().describe('Total number of matching results'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      results: z.array(personResultSchema).describe('Matching person records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, any> = {};

    if (ctx.input.firstName) input.firstName = ctx.input.firstName;
    if (ctx.input.lastName) input.lastName = ctx.input.lastName;
    if (ctx.input.fullName) input.fullName = ctx.input.fullName;
    if (ctx.input.linkedinUrl) input.linkedinUrl = ctx.input.linkedinUrl;
    if (ctx.input.linkedinId) input.linkedinId = ctx.input.linkedinId;
    if (ctx.input.email) input.email = ctx.input.email;
    if (ctx.input.hashedEmail) input.hashedEmail = ctx.input.hashedEmail;
    if (ctx.input.phone) input.phone = ctx.input.phone;
    if (ctx.input.profileFilter) input.profileFilter = ctx.input.profileFilter;
    if (ctx.input.qualityFilter) input.qualityFilter = ctx.input.qualityFilter;
    if (ctx.input.minConfidence !== undefined) input.minConfidence = ctx.input.minConfidence;

    if (ctx.input.companyName || ctx.input.companyDomain) {
      input.company = {} as Record<string, any>;
      if (ctx.input.companyName) input.company.name = ctx.input.companyName;
      if (ctx.input.companyDomain) input.company.domain = ctx.input.companyDomain;
    }

    let result = await client.searchPeople(input);

    let results = (result.results ?? []).map((r: any) => ({
      personId: r._id,
      name: r.name,
      linkedin: r.linkedin,
      personalEmails: r.personalEmails,
      personalPhones: r.personalPhones,
      currentPositions: r.currentPositions,
      pastPositions: r.pastPositions
    }));

    let totalResults = result.totalResults ?? 0;

    return {
      output: {
        totalResults,
        hasMore: result.hasMore ?? false,
        results
      },
      message:
        totalResults > 0
          ? `Found **${totalResults}** matching contact(s). ${results[0]?.name?.fullName ? `Top match: **${results[0].name.fullName}**` : ''}`
          : 'No matching contacts found.'
    };
  })
  .build();
