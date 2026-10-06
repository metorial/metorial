import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalRow, optionalText, row } from '../lib/client';
import { spec } from '../spec';

export let enrichPerson = SlateTool.create(spec, {
  name: 'Enrich Person',
  key: 'enrich_person',
  description: `Retrieve detailed profile information about a person given their email address or LinkedIn handle. Returns name, location, employment details, social profiles, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the person to enrich'),
      linkedinHandle: z
        .string()
        .optional()
        .describe('LinkedIn handle or profile URL of the person')
    })
  )
  .output(
    z.object({
      email: z.string().nullable().describe('Email address'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      fullName: z.string().nullable().describe('Full name'),
      country: z.string().nullable().describe('Country'),
      city: z.string().nullable().describe('City'),
      state: z.string().nullable().describe('State'),
      linkedinUrl: z.string().nullable().describe('LinkedIn profile URL'),
      twitter: z.string().nullable().describe('Twitter handle'),
      github: z.string().nullable().describe('GitHub handle'),
      facebook: z.string().nullable().describe('Facebook URL'),
      phone: z.string().nullable().describe('Phone number'),
      company: z.string().nullable().describe('Current company name'),
      companyDomain: z.string().nullable().describe('Current company domain'),
      position: z.string().nullable().describe('Current job position')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).enrichPerson({
      email: ctx.input.email,
      linkedinHandle: ctx.input.linkedinHandle
    });
    const data = row(result.data),
      name = optionalRow(data.name),
      geo = optionalRow(data.geo),
      employment = optionalRow(data.employment);
    const handle = (value: unknown) => optionalText(optionalRow(value).handle) ?? null;
    const linkedin = handle(data.linkedin);
    return {
      output: {
        email: optionalText(data.email) ?? null,
        firstName: optionalText(name.givenName) ?? null,
        lastName: optionalText(name.familyName) ?? null,
        fullName: optionalText(name.fullName) ?? null,
        country: optionalText(geo.country) ?? null,
        city: optionalText(geo.city) ?? null,
        state: optionalText(geo.state) ?? null,
        linkedinUrl: linkedin
          ? `https://www.linkedin.com/in/${encodeURIComponent(linkedin)}`
          : null,
        twitter: handle(data.twitter),
        github: handle(data.github),
        facebook: handle(data.facebook),
        phone: optionalText(data.phone) ?? null,
        company: optionalText(employment.name) ?? null,
        companyDomain: optionalText(employment.domain) ?? null,
        position: optionalText(employment.title) ?? null
      },
      message: 'Retrieved the person enrichment profile.'
    };
  })
  .build();
