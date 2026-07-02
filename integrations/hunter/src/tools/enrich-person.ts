import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.enrichPerson({
      email: ctx.input.email,
      linkedinHandle: ctx.input.linkedinHandle
    });

    let data = result.data;

    return {
      output: {
        email: data.email ?? null,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
        fullName: data.full_name ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        linkedinUrl: data.linkedin_url ?? null,
        twitter: data.twitter ?? null,
        github: data.github ?? null,
        facebook: data.facebook ?? null,
        phone: data.phone ?? null,
        company: data.organization ?? data.company ?? null,
        companyDomain: data.organization_domain ?? null,
        position: data.position ?? null
      },
      message: data.first_name
        ? `Found profile for **${data.first_name} ${data.last_name ?? ''}** at ${data.organization ?? 'unknown company'}.`
        : `No person data found for the given input.`
    };
  })
  .build();
