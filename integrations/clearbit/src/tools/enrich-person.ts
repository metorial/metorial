import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

let personGeoSchema = z
  .object({
    city: z.string().nullable().describe('City'),
    state: z.string().nullable().describe('State or region'),
    stateCode: z.string().nullable().describe('State code'),
    country: z.string().nullable().describe('Country'),
    countryCode: z.string().nullable().describe('Two-letter country code'),
    lat: z.number().nullable().describe('Latitude'),
    lng: z.number().nullable().describe('Longitude')
  })
  .nullable();

let employmentSchema = z
  .object({
    domain: z.string().nullable().describe('Employer domain'),
    name: z.string().nullable().describe('Employer company name'),
    title: z.string().nullable().describe('Job title'),
    role: z.string().nullable().describe('Job role'),
    subRole: z.string().nullable().describe('Job sub-role'),
    seniority: z.string().nullable().describe('Job seniority level')
  })
  .nullable();

export let enrichPerson = SlateTool.create(spec, {
  name: 'Enrich Person',
  key: 'enrich_person',
  description: `Look up detailed information about a person using their email address. Returns demographic data including name, location, employment details, social media profiles, and more. Use for enriching contact records, lead scoring, or building customer profiles.`,
  instructions: [
    'Uses the streaming API for synchronous results. Returns a 404 error if the person is not found.'
  ],
  constraints: [
    'Rate limited to 600 requests per minute.',
    'Not all fields are guaranteed to return a value.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the person to look up'),
      subscribe: z
        .boolean()
        .optional()
        .describe('Subscribe to updates for this person via webhook')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('Clearbit person identifier'),
      email: z.string().nullable().describe('Email address'),
      fullName: z.string().nullable().describe('Full name'),
      givenName: z.string().nullable().describe('First name'),
      familyName: z.string().nullable().describe('Last name'),
      avatar: z.string().nullable().describe('Avatar URL'),
      gender: z.string().nullable().describe('Gender'),
      location: z.string().nullable().describe('Location string'),
      timeZone: z.string().nullable().describe('Time zone'),
      bio: z.string().nullable().describe('Short bio'),
      site: z.string().nullable().describe('Personal website URL'),
      geo: personGeoSchema,
      employment: employmentSchema,
      facebookHandle: z.string().nullable().describe('Facebook handle'),
      twitterHandle: z.string().nullable().describe('Twitter handle'),
      linkedinHandle: z.string().nullable().describe('LinkedIn handle'),
      githubHandle: z.string().nullable().describe('GitHub handle'),
      emailProvider: z
        .boolean()
        .nullable()
        .describe('Whether the email is from a free provider'),
      indexedAt: z.string().nullable().describe('When the record was last refreshed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let person = await client.findPerson({
      email: ctx.input.email,
      subscribe: ctx.input.subscribe
    });

    let output = {
      personId: person.id,
      email: person.email,
      fullName: person.name?.fullName ?? null,
      givenName: person.name?.givenName ?? null,
      familyName: person.name?.familyName ?? null,
      avatar: person.avatar,
      gender: person.gender,
      location: person.location,
      timeZone: person.timeZone,
      bio: person.bio,
      site: person.site,
      geo: person.geo,
      employment: person.employment,
      facebookHandle: person.facebook?.handle ?? null,
      twitterHandle: person.twitter?.handle ?? null,
      linkedinHandle: person.linkedin?.handle ?? null,
      githubHandle: person.github?.handle ?? null,
      emailProvider: person.emailProvider,
      indexedAt: person.indexedAt
    };

    let namePart = output.fullName ? ` **${output.fullName}**` : '';
    let titlePart = output.employment?.title ? ` — ${output.employment.title}` : '';
    let companyPart = output.employment?.name ? ` at ${output.employment.name}` : '';

    return {
      output,
      message: `Found person${namePart}${titlePart}${companyPart}.`
    };
  })
  .build();
