import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

let geoSchema = z
  .object({
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    stateCode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    countryCode: z.string().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional()
  })
  .optional();

let employmentSchema = z
  .object({
    domain: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    subRole: z.string().nullable().optional(),
    seniority: z.string().nullable().optional()
  })
  .optional();

export let enrich = SlateTool.create(spec, {
  name: 'Email Enrichment',
  key: 'enrich',
  description: `Look up person and company data based on an email address. Returns name, company, job title, country, social profiles, confidence score, and email verification details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to enrich')
    })
  )
  .output(
    z.object({
      email: z.string().nullable().optional().describe('Email address'),
      fullName: z.string().nullable().optional().describe('Full name'),
      givenName: z.string().nullable().optional().describe('First/given name'),
      familyName: z.string().nullable().optional().describe('Last/family name'),
      company: z.string().nullable().optional().describe('Company name'),
      position: z.string().nullable().optional().describe('Job title'),
      country: z.string().nullable().optional().describe('Country code'),
      score: z.number().nullable().optional().describe('Confidence score'),
      websiteUrl: z.string().nullable().optional().describe('Company domain'),
      verification: z
        .object({
          date: z.string().nullable().optional(),
          status: z.string().nullable().optional()
        })
        .optional()
        .describe('Last verification date and status'),
      location: z.string().nullable().optional().describe('Location string'),
      timeZone: z.string().nullable().optional().describe('Timezone'),
      geo: geoSchema.describe('Geographic location details'),
      bio: z.string().nullable().optional().describe('Bio/description'),
      site: z.string().nullable().optional().describe('Personal website'),
      avatar: z.string().nullable().optional().describe('Avatar URL'),
      employment: employmentSchema.describe('Current employment information'),
      phone: z.string().nullable().optional().describe('Phone number'),
      twitter: z.string().nullable().optional().describe('Twitter handle'),
      linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
      facebook: z.string().nullable().optional().describe('Facebook profile URL'),
      github: z.string().nullable().optional().describe('GitHub profile URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.enrich(ctx.input.email);
    let data = result.data || result;

    return {
      output: {
        email: data.email,
        company: data.company,
        position: data.position,
        country: data.country,
        score: data.score,
        websiteUrl: data.website_url,
        verification: data.verification,
        fullName: data.full_name ?? data.name?.fullName ?? data.name?.full_name,
        givenName: data.first_name ?? data.name?.givenName ?? data.name?.given_name,
        familyName: data.last_name ?? data.name?.familyName ?? data.name?.family_name,
        location: data.location,
        timeZone: data.timeZone || data.time_zone,
        geo: data.geo
          ? {
              city: data.geo.city,
              state: data.geo.state,
              stateCode: data.geo.stateCode || data.geo.state_code,
              country: data.geo.country,
              countryCode: data.geo.countryCode || data.geo.country_code,
              lat: data.geo.lat,
              lng: data.geo.lng
            }
          : undefined,
        bio: data.bio,
        site: data.site,
        avatar: data.avatar,
        employment: data.employment
          ? {
              domain: data.employment.domain,
              name: data.employment.name,
              title: data.employment.title,
              role: data.employment.role,
              subRole: data.employment.subRole || data.employment.sub_role,
              seniority: data.employment.seniority
            }
          : data.company || data.position || data.website_url
            ? {
                domain: data.website_url,
                name: data.company,
                title: data.position
              }
            : undefined,
        phone: data.phone,
        twitter: data.twitter?.handle || data.twitter,
        linkedin: data.linkedin?.handle || data.linkedin,
        facebook: data.facebook?.handle || data.facebook,
        github: data.github?.handle || data.github
      },
      message: data.email
        ? `Enriched data for **${ctx.input.email}**: ${data.full_name || data.name?.fullName || 'unknown name'}, ${data.position || data.employment?.title || 'unknown title'} at ${data.company || data.employment?.name || 'unknown company'}.`
        : `No enrichment data found for **${ctx.input.email}**.`
    };
  })
  .build();
