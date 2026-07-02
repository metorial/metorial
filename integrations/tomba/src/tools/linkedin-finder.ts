import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

export let linkedinFinder = SlateTool.create(spec, {
  name: 'LinkedIn Finder',
  key: 'linkedin_finder',
  description: `Find a professional email address from a LinkedIn profile URL. Returns the email, job details, and confidence score.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('LinkedIn profile URL (e.g. "https://www.linkedin.com/in/username")')
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
      twitter: z.string().nullable().optional().describe('Twitter handle'),
      linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
      score: z.number().nullable().optional().describe('Confidence score (0-100)'),
      websiteUrl: z.string().nullable().optional().describe('Website URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.linkedinFinder(ctx.input.url);
    let data = result.data || {};

    return {
      output: {
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: data.full_name,
        company: data.company,
        position: data.position,
        country: data.country,
        twitter: data.twitter,
        linkedin: data.linkedin,
        score: data.score,
        websiteUrl: data.website_url
      },
      message: data.email
        ? `Found email **${data.email}** for LinkedIn profile (score: ${data.score}).`
        : `No email found for the given LinkedIn profile.`
    };
  })
  .build();
