import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let profileOutput = z.object({
  fullName: z.string().optional(),
  username: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  photoUrl: z.string().optional(),
  skills: z.array(z.string()).optional(),
  raw: z.any().describe('Complete public profile response, including education and experience')
});

export let linkedinProfile = SlateTool.create(spec, {
  key: 'linkedin_profile',
  name: 'LinkedIn Profile',
  description:
    'Retrieve a public LinkedIn profile by username, profile URL, or encoded member ID. Costs 1 credit. Restricted profile visibility can leave fields empty.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('LinkedIn username, profile URL, or encoded member ID')
    })
  )
  .output(profileOutput)
  .handleInvocation(async ctx => {
    let result = await new PiloterrClient(ctx.auth.token).getLinkedInProfile(ctx.input);
    return {
      output: normalizeOutput(profileOutput, {
        fullName: result.full_name,
        username: result.username,
        headline: result.headline,
        summary: result.summary,
        photoUrl: result.photo_url,
        skills: result.skills,
        raw: result
      }),
      message: 'Retrieved public LinkedIn profile data.'
    };
  })
  .build();

export let linkedinJobSuggestions = SlateTool.create(spec, {
  key: 'linkedin_job_suggestions',
  name: 'LinkedIn Job Suggestions',
  description:
    'Discover LinkedIn location IDs or job keyword suggestions. Set location=true to find IDs for linkedin_job_search and linkedin_job_count. Costs 1 credit.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Prefix of a job keyword or location name'),
      location: z
        .boolean()
        .optional()
        .describe('True for location IDs; false for keyword suggestions')
    })
  )
  .output(
    z.object({
      suggestions: z.array(
        z.object({
          id: z.string().optional(),
          name: z.string().optional(),
          type: z.string().optional()
        })
      ),
      raw: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new PiloterrClient(ctx.auth.token).suggestLinkedInJobs(ctx.input);
    return {
      output: { suggestions: result, raw: result },
      message: 'Retrieved LinkedIn suggestions.'
    };
  })
  .build();

export let linkedinJobCount = SlateTool.create(spec, {
  key: 'linkedin_job_count',
  name: 'LinkedIn Job Count',
  description:
    'Count LinkedIn job listings by keyword, location, company, experience, employment type, recency, or work arrangement. Costs 1 credit.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      keyword: z.string().optional(),
      experienceLevel: z
        .enum(['internship', 'entry_level', 'associate', 'mid_senior', 'director'])
        .optional(),
      jobType: z
        .enum(['full_time', 'part_time', 'contract', 'temporary', 'internship', 'volunteer'])
        .optional(),
      when: z.enum(['day', 'week', 'month']).optional(),
      flexibility: z.enum(['remote', 'flexible', 'on_site']).optional(),
      distance: z
        .number()
        .optional()
        .describe('Radius in miles; requires geoId. Documented values: 5, 10, 25, 50, 100'),
      geoId: z
        .string()
        .optional()
        .describe(
          'Call linkedin_job_suggestions with location=true to discover a location ID'
        ),
      companyId: z
        .string()
        .optional()
        .describe('Call linkedin_company to discover its companyId')
    })
  )
  .output(z.object({ count: z.number(), raw: z.any() }))
  .handleInvocation(async ctx => {
    if (ctx.input.distance !== undefined && !ctx.input.geoId)
      throw createApiServiceError(
        'Provide geoId with distance. Call linkedin_job_suggestions to discover a location ID.'
      );
    let result = await new PiloterrClient(ctx.auth.token).getLinkedInJobCount(ctx.input);
    if (typeof result.count !== 'number' || !Number.isFinite(result.count))
      throw createApiServiceError('Piloterr returned an invalid job count.');
    return {
      output: { count: result.count, raw: result },
      message: 'Retrieved LinkedIn job count.'
    };
  })
  .build();
