import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findProfileUrl = SlateTool.create(spec, {
  name: 'Find Profile URL',
  key: 'find_profile_url',
  description: `Find a LinkedIn profile URL for a person or a company. For people, provide name and optionally company/job title. For companies, provide the company name or domain.`,
  instructions: [
    'For best results with person searches, provide only essential information (name + company).',
    'Set targetType to "person" or "company" to specify what you are looking for.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      targetType: z
        .enum(['person', 'company'])
        .describe('Whether to find a person or company profile URL'),
      firstname: z.string().optional().describe('First name (person search only)'),
      lastname: z.string().optional().describe('Last name (person search only)'),
      companyOrDomain: z.string().optional().describe('Company name or domain'),
      jobTitle: z.string().optional().describe('Job title (person search only)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the search succeeded'),
      profileUrl: z.string().optional().describe('The found LinkedIn profile URL'),
      raw: z.any().optional().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.targetType === 'company') {
      result = await client.findCompanyUrl(ctx.input.companyOrDomain || '');
    } else {
      result = await client.findPersonUrl({
        firstname: ctx.input.firstname,
        lastname: ctx.input.lastname,
        companyOrDomain: ctx.input.companyOrDomain,
        jobTitle: ctx.input.jobTitle
      });
    }

    let profileUrl = result?.url || result?.profileUrl || result?.linkedinUrl;

    return {
      output: {
        success: result?.success ?? !!profileUrl,
        profileUrl,
        raw: result
      },
      message: profileUrl
        ? `Found profile URL: **${profileUrl}**`
        : `No profile URL found for the given criteria.`
    };
  })
  .build();
