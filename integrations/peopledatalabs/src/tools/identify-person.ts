import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let matchedPersonSchema = z.object({
  personId: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  workEmail: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  jobCompanyName: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  matchScore: z
    .number()
    .nullable()
    .optional()
    .describe('Confidence score indicating match strength')
});

export let identifyPerson = SlateTool.create(spec, {
  name: 'Identify Person',
  key: 'identify_person',
  description: `Retrieve multiple potential person matches ranked by confidence score. Use broad search inputs to find candidates when you have partial or ambiguous information about an individual.
Returns up to 20 matching profiles sorted by match strength, useful for building comprehensive profiles from limited data.`,
  instructions: [
    'Provide at least one identifying attribute such as name, email, phone, company, school, or location.',
    'The more attributes provided, the more accurate the match ranking will be.'
  ],
  constraints: ['Returns a maximum of 20 matching profiles per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Full name of the person'),
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      email: z.string().optional().describe('Email address associated with the person'),
      phone: z.string().optional().describe('Phone number associated with the person'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      company: z.string().optional().describe('Company name where the person works or worked'),
      school: z.string().optional().describe('School name the person attended'),
      location: z.string().optional().describe('Location of the person'),
      locality: z.string().optional().describe('City/locality of the person'),
      region: z.string().optional().describe('State/region of the person'),
      country: z.string().optional().describe('Country of the person'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(
    z.object({
      matches: z
        .array(matchedPersonSchema)
        .describe('Matching person records ranked by confidence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.firstName) params.first_name = ctx.input.firstName;
    if (ctx.input.lastName) params.last_name = ctx.input.lastName;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.phone) params.phone = ctx.input.phone;
    if (ctx.input.linkedinUrl) params.profile = ctx.input.linkedinUrl;
    if (ctx.input.company) params.company = ctx.input.company;
    if (ctx.input.school) params.school = ctx.input.school;
    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.locality) params.locality = ctx.input.locality;
    if (ctx.input.region) params.region = ctx.input.region;
    if (ctx.input.country) params.country = ctx.input.country;
    if (ctx.input.titlecase !== undefined) params.titlecase = ctx.input.titlecase;

    let result = await client.identifyPerson(params);
    let records = result.matches || result.data || [];

    let matches = records.map((record: any) => {
      let data = record.data || record;
      return {
        personId: data.id ?? null,
        fullName: data.full_name ?? null,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
        linkedinUrl: data.linkedin_url ?? null,
        workEmail: data.work_email ?? null,
        jobTitle: data.job_title ?? null,
        jobCompanyName: data.job_company_name ?? null,
        locationName: data.location_name ?? null,
        matchScore: record.match_score ?? null
      };
    });

    return {
      output: { matches },
      message: `Found **${matches.length}** potential matches.${matches.length > 0 && matches[0]?.fullName ? ` Top match: **${matches[0].fullName}**${matches[0].matchScore !== null ? ` (score: ${matches[0].matchScore})` : ''}` : ''}`
    };
  })
  .build();
