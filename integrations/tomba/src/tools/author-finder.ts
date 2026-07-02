import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

export let authorFinder = SlateTool.create(spec, {
  name: 'Author Finder',
  key: 'author_finder',
  description: `Find the author's email address from a blog post or article URL. Returns the author's name, email, and confidence score.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the blog post or article')
    })
  )
  .output(
    z.object({
      email: z.string().nullable().optional().describe('Author email address'),
      firstName: z.string().nullable().optional().describe('Author first name'),
      lastName: z.string().nullable().optional().describe('Author last name'),
      fullName: z.string().nullable().optional().describe('Author full name'),
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

    let result = await client.authorFinder(ctx.input.url);
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
        ? `Found author **${data.full_name || 'Unknown'}** with email **${data.email}** (score: ${data.score}).`
        : `No author email found for the given URL.`
    };
  })
  .build();
