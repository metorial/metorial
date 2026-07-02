import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { mapPersonData } from './enrich-person';

export let retrievePerson = SlateTool.create(spec, {
  name: 'Retrieve Person',
  key: 'retrieve_person',
  description: `Retrieve a specific person record using a unique PDL Person ID. PDL IDs are permanent identifiers for each record in the dataset, allowing direct retrieval of a known person's data.`,
  instructions: [
    'You must provide a valid PDL Person ID, which can be obtained from enrichment, search, or identify responses.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.string().describe('The unique PDL Person ID to retrieve'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(
    z.object({
      personId: z.string().nullable().optional(),
      fullName: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      middleName: z.string().nullable().optional(),
      sex: z.string().nullable().optional(),
      birthDate: z.string().nullable().optional(),
      linkedinUrl: z.string().nullable().optional(),
      linkedinUsername: z.string().nullable().optional(),
      facebookUrl: z.string().nullable().optional(),
      twitterUrl: z.string().nullable().optional(),
      githubUrl: z.string().nullable().optional(),
      workEmail: z.string().nullable().optional(),
      personalEmails: z.array(z.string()).nullable().optional(),
      mobilePhone: z.string().nullable().optional(),
      industry: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      jobCompanyName: z.string().nullable().optional(),
      jobCompanyWebsite: z.string().nullable().optional(),
      jobCompanyIndustry: z.string().nullable().optional(),
      locationName: z.string().nullable().optional(),
      locationCountry: z.string().nullable().optional(),
      skills: z.array(z.string()).nullable().optional(),
      experience: z.array(z.any()).nullable().optional(),
      education: z.array(z.any()).nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.titlecase !== undefined) params.titlecase = ctx.input.titlecase;

    let result = await client.retrievePerson(ctx.input.personId, params);
    let data = result.data || result;

    let mapped = mapPersonData(data);

    return {
      output: {
        personId: mapped.personId,
        fullName: mapped.fullName,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        middleName: mapped.middleName,
        sex: mapped.sex,
        birthDate: mapped.birthDate,
        linkedinUrl: mapped.linkedinUrl,
        linkedinUsername: mapped.linkedinUsername,
        facebookUrl: mapped.facebookUrl,
        twitterUrl: mapped.twitterUrl,
        githubUrl: mapped.githubUrl,
        workEmail: mapped.workEmail,
        personalEmails: mapped.personalEmails,
        mobilePhone: mapped.mobilePhone,
        industry: mapped.industry,
        jobTitle: mapped.jobTitle,
        jobCompanyName: mapped.jobCompanyName,
        jobCompanyWebsite: mapped.jobCompanyWebsite,
        jobCompanyIndustry: mapped.jobCompanyIndustry,
        locationName: mapped.locationName,
        locationCountry: mapped.locationCountry,
        skills: mapped.skills,
        experience: mapped.experience,
        education: mapped.education
      },
      message: mapped.fullName
        ? `Retrieved person: **${mapped.fullName}**${mapped.jobTitle ? ` - ${mapped.jobTitle}` : ''}${mapped.jobCompanyName ? ` at ${mapped.jobCompanyName}` : ''}`
        : `Retrieved person record for ID: ${ctx.input.personId}`
    };
  })
  .build();
