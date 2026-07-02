import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let experienceSchema = z
  .object({
    company: z
      .object({
        name: z.string().nullable().optional(),
        size: z.string().nullable().optional(),
        founded: z.number().nullable().optional(),
        industry: z.string().nullable().optional(),
        location: z
          .object({
            name: z.string().nullable().optional(),
            locality: z.string().nullable().optional(),
            region: z.string().nullable().optional(),
            country: z.string().nullable().optional()
          })
          .nullable()
          .optional(),
        linkedinUrl: z.string().nullable().optional(),
        websiteUrl: z.string().nullable().optional()
      })
      .nullable()
      .optional(),
    title: z
      .object({
        name: z.string().nullable().optional(),
        role: z.string().nullable().optional(),
        subRole: z.string().nullable().optional(),
        levels: z.array(z.string()).nullable().optional()
      })
      .nullable()
      .optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    isCurrent: z.boolean().nullable().optional(),
    summary: z.string().nullable().optional()
  })
  .describe('Employment experience entry');

let educationSchema = z
  .object({
    school: z
      .object({
        name: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        linkedinUrl: z.string().nullable().optional(),
        websiteUrl: z.string().nullable().optional(),
        location: z
          .object({
            name: z.string().nullable().optional(),
            locality: z.string().nullable().optional(),
            region: z.string().nullable().optional(),
            country: z.string().nullable().optional()
          })
          .nullable()
          .optional()
      })
      .nullable()
      .optional(),
    degrees: z.array(z.string()).nullable().optional(),
    majors: z.array(z.string()).nullable().optional(),
    minors: z.array(z.string()).nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    gpa: z.number().nullable().optional()
  })
  .describe('Education entry');

let personOutputSchema = z
  .object({
    personId: z
      .string()
      .nullable()
      .optional()
      .describe('Unique PDL identifier for this person'),
    fullName: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    middleName: z.string().nullable().optional(),
    sex: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    linkedinUsername: z.string().nullable().optional(),
    facebookUrl: z.string().nullable().optional(),
    facebookUsername: z.string().nullable().optional(),
    twitterUrl: z.string().nullable().optional(),
    twitterUsername: z.string().nullable().optional(),
    githubUrl: z.string().nullable().optional(),
    githubUsername: z.string().nullable().optional(),
    workEmail: z.string().nullable().optional(),
    personalEmails: z.array(z.string()).nullable().optional(),
    mobilePhone: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    jobTitleRole: z.string().nullable().optional(),
    jobTitleSubRole: z.string().nullable().optional(),
    jobTitleLevels: z.array(z.string()).nullable().optional(),
    jobCompanyName: z.string().nullable().optional(),
    jobCompanyWebsite: z.string().nullable().optional(),
    jobCompanyIndustry: z.string().nullable().optional(),
    jobCompanySize: z.string().nullable().optional(),
    jobCompanyLinkedinUrl: z.string().nullable().optional(),
    jobCompanyLocationName: z.string().nullable().optional(),
    locationName: z.string().nullable().optional(),
    locationLocality: z.string().nullable().optional(),
    locationRegion: z.string().nullable().optional(),
    locationCountry: z.string().nullable().optional(),
    locationContinent: z.string().nullable().optional(),
    skills: z.array(z.string()).nullable().optional(),
    interests: z.array(z.string()).nullable().optional(),
    experience: z.array(experienceSchema).nullable().optional(),
    education: z.array(educationSchema).nullable().optional(),
    certifications: z.array(z.any()).nullable().optional(),
    languages: z.array(z.string()).nullable().optional(),
    likelihood: z
      .number()
      .nullable()
      .optional()
      .describe('Confidence score from 0-10 for the match')
  })
  .describe('Enriched person profile');

export let enrichPerson = SlateTool.create(spec, {
  name: 'Enrich Person',
  key: 'enrich_person',
  description: `Enrich data on a person by matching against nearly three billion profiles. Provide identifying information such as name, email, phone, social profile URL, company, school, or location to find a matching profile.
Returns comprehensive person data including employment history, education, social profiles, skills, and contact information.`,
  instructions: [
    'Provide at least one identifying parameter (email, phone, LinkedIn URL, name + company, etc.) for best results.',
    'The more identifying information you provide, the higher the match confidence will be.'
  ],
  constraints: [
    'Each successful enrichment consumes one API credit.',
    'Minimum likelihood threshold defaults to 2 (scale 0-10).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Full name of the person (e.g. "John Smith")'),
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      middleName: z.string().optional().describe('Middle name of the person'),
      email: z.string().optional().describe('Email address associated with the person'),
      phone: z.string().optional().describe('Phone number associated with the person'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      facebookUrl: z.string().optional().describe('Facebook profile URL'),
      twitterUrl: z.string().optional().describe('Twitter/X profile URL'),
      githubUrl: z.string().optional().describe('GitHub profile URL'),
      company: z.string().optional().describe('Company name where the person works or worked'),
      school: z.string().optional().describe('School name the person attended'),
      location: z
        .string()
        .optional()
        .describe('Location of the person (e.g. "San Francisco, CA")'),
      locality: z.string().optional().describe('City/locality of the person'),
      region: z.string().optional().describe('State/region of the person'),
      country: z.string().optional().describe('Country of the person (ISO 3166-1 alpha-2)'),
      streetAddress: z.string().optional().describe('Street address of the person'),
      postalCode: z.string().optional().describe('Postal/zip code of the person'),
      birthDate: z
        .string()
        .optional()
        .describe('Birth date of the person (YYYY-MM-DD or YYYY)'),
      minLikelihood: z
        .number()
        .min(0)
        .max(10)
        .optional()
        .describe('Minimum confidence score (0-10) for match, defaults to 2'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(personOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.firstName) params.first_name = ctx.input.firstName;
    if (ctx.input.lastName) params.last_name = ctx.input.lastName;
    if (ctx.input.middleName) params.middle_name = ctx.input.middleName;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.phone) params.phone = ctx.input.phone;
    if (ctx.input.linkedinUrl) params.profile = ctx.input.linkedinUrl;
    if (ctx.input.facebookUrl) params.profile = ctx.input.facebookUrl;
    if (ctx.input.twitterUrl) params.profile = ctx.input.twitterUrl;
    if (ctx.input.githubUrl) params.profile = ctx.input.githubUrl;
    if (ctx.input.company) params.company = ctx.input.company;
    if (ctx.input.school) params.school = ctx.input.school;
    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.locality) params.locality = ctx.input.locality;
    if (ctx.input.region) params.region = ctx.input.region;
    if (ctx.input.country) params.country = ctx.input.country;
    if (ctx.input.streetAddress) params.street_address = ctx.input.streetAddress;
    if (ctx.input.postalCode) params.postal_code = ctx.input.postalCode;
    if (ctx.input.birthDate) params.birth_date = ctx.input.birthDate;
    if (ctx.input.minLikelihood !== undefined) params.min_likelihood = ctx.input.minLikelihood;
    if (ctx.input.titlecase !== undefined) params.titlecase = ctx.input.titlecase;

    let result = await client.enrichPerson(params);
    let data = result.data || result;

    let output = mapPersonData(data);
    output.likelihood = result.likelihood ?? data.likelihood ?? null;

    return {
      output,
      message: output.fullName
        ? `Found person: **${output.fullName}**${output.jobTitle ? ` - ${output.jobTitle}` : ''}${output.jobCompanyName ? ` at ${output.jobCompanyName}` : ''}${output.likelihood !== null ? ` (confidence: ${output.likelihood}/10)` : ''}`
        : 'No matching person found for the provided parameters.'
    };
  })
  .build();

export let mapPersonData = (data: any) => {
  return {
    personId: data.id ?? null,
    fullName: data.full_name ?? null,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    middleName: data.middle_name ?? null,
    sex: data.sex ?? null,
    birthDate: data.birth_date ?? null,
    linkedinUrl: data.linkedin_url ?? null,
    linkedinUsername: data.linkedin_username ?? null,
    facebookUrl: data.facebook_url ?? null,
    facebookUsername: data.facebook_username ?? null,
    twitterUrl: data.twitter_url ?? null,
    twitterUsername: data.twitter_username ?? null,
    githubUrl: data.github_url ?? null,
    githubUsername: data.github_username ?? null,
    workEmail: data.work_email ?? null,
    personalEmails: data.personal_emails ?? null,
    mobilePhone: data.mobile_phone ?? null,
    industry: data.industry ?? null,
    jobTitle: data.job_title ?? null,
    jobTitleRole: data.job_title_role ?? null,
    jobTitleSubRole: data.job_title_sub_role ?? null,
    jobTitleLevels: data.job_title_levels ?? null,
    jobCompanyName: data.job_company_name ?? null,
    jobCompanyWebsite: data.job_company_website ?? null,
    jobCompanyIndustry: data.job_company_industry ?? null,
    jobCompanySize: data.job_company_size ?? null,
    jobCompanyLinkedinUrl: data.job_company_linkedin_url ?? null,
    jobCompanyLocationName: data.job_company_location_name ?? null,
    locationName: data.location_name ?? null,
    locationLocality: data.location_locality ?? null,
    locationRegion: data.location_region ?? null,
    locationCountry: data.location_country ?? null,
    locationContinent: data.location_continent ?? null,
    skills: data.skills ?? null,
    interests: data.interests ?? null,
    experience:
      data.experience?.map((exp: any) => ({
        company: exp.company
          ? {
              name: exp.company.name ?? null,
              size: exp.company.size ?? null,
              founded: exp.company.founded ?? null,
              industry: exp.company.industry ?? null,
              location: exp.company.location
                ? {
                    name: exp.company.location.name ?? null,
                    locality: exp.company.location.locality ?? null,
                    region: exp.company.location.region ?? null,
                    country: exp.company.location.country ?? null
                  }
                : null,
              linkedinUrl: exp.company.linkedin_url ?? null,
              websiteUrl: exp.company.website ?? null
            }
          : null,
        title: exp.title
          ? {
              name: exp.title.name ?? null,
              role: exp.title.role ?? null,
              subRole: exp.title.sub_role ?? null,
              levels: exp.title.levels ?? null
            }
          : null,
        startDate: exp.start_date ?? null,
        endDate: exp.end_date ?? null,
        isCurrent: exp.is_primary ?? null,
        summary: exp.summary ?? null
      })) ?? null,
    education:
      data.education?.map((edu: any) => ({
        school: edu.school
          ? {
              name: edu.school.name ?? null,
              type: edu.school.type ?? null,
              linkedinUrl: edu.school.linkedin_url ?? null,
              websiteUrl: edu.school.website ?? null,
              location: edu.school.location
                ? {
                    name: edu.school.location.name ?? null,
                    locality: edu.school.location.locality ?? null,
                    region: edu.school.location.region ?? null,
                    country: edu.school.location.country ?? null
                  }
                : null
            }
          : null,
        degrees: edu.degrees ?? null,
        majors: edu.majors ?? null,
        minors: edu.minors ?? null,
        startDate: edu.start_date ?? null,
        endDate: edu.end_date ?? null,
        gpa: edu.gpa ?? null
      })) ?? null,
    certifications: data.certifications ?? null,
    languages: data.languages ?? null,
    likelihood: null as number | null
  };
};
