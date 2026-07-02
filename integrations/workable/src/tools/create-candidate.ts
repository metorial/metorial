import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { buildCandidateCreateRequest, unwrapCandidate } from '../lib/shapes';
import { spec } from '../spec';

export let createCandidateTool = SlateTool.create(spec, {
  name: 'Create Candidate',
  key: 'create_candidate',
  description: `Add a candidate to a Workable job. Workable requires email plus either name or both first and last name; stage is sent as a query parameter and sourced is sent at the request body root.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobShortcode: z.string().describe('The shortcode of the job to add the candidate to'),
      name: z
        .string()
        .optional()
        .describe('Full candidate name; required unless firstname and lastname are provided'),
      firstname: z.string().optional().describe('Candidate first name'),
      lastname: z.string().optional().describe('Candidate last name'),
      email: z.string().describe('Candidate email address'),
      phone: z.string().optional().describe('Phone number'),
      headline: z.string().optional().describe('Professional headline'),
      summary: z.string().optional().describe('Candidate summary'),
      address: z.string().optional().describe('Address'),
      coverLetter: z.string().optional().describe('Candidate cover letter'),
      stage: z.string().optional().describe('Pipeline stage slug to place the candidate in'),
      sourced: z
        .boolean()
        .optional()
        .describe('Whether this candidate was sourced rather than applied'),
      resumeUrl: z.string().optional().describe('URL to a resume Workable can fetch'),
      resume: z
        .object({
          name: z.string().describe('Resume file name'),
          data: z.string().describe('Base64-encoded resume content')
        })
        .optional()
        .describe('Resume file object accepted by Workable'),
      skills: z.array(z.string()).optional().describe('Candidate skills'),
      answers: z
        .array(z.any())
        .optional()
        .describe('Application answers in Workable API shape'),
      customFields: z
        .array(z.any())
        .optional()
        .describe('Candidate custom fields in Workable API shape'),
      disqualified: z.boolean().optional().describe('Create candidate as disqualified'),
      disqualificationReason: z
        .string()
        .optional()
        .describe('Disqualification reason when creating as disqualified'),
      imageUrl: z.string().optional().describe('Candidate image URL'),
      domain: z.string().optional().describe('Candidate domain'),
      recruiterKey: z.string().optional().describe('Recruiter key'),
      socialProfiles: z
        .array(
          z.object({
            type: z
              .enum(['twitter', 'linkedin', 'facebook', 'github', 'other'])
              .describe('Social network type'),
            url: z.string().describe('Profile URL')
          })
        )
        .optional()
        .describe('Social profiles'),
      education: z
        .array(
          z.object({
            school: z.string().optional(),
            degree: z.string().optional(),
            fieldOfStudy: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional()
          })
        )
        .optional()
        .describe('Education entries'),
      experience: z
        .array(
          z.object({
            title: z.string().optional(),
            company: z.string().optional(),
            industry: z.string().optional(),
            summary: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            current: z.boolean().optional()
          })
        )
        .optional()
        .describe('Experience entries'),
      tags: z.array(z.string()).optional().describe('Tags to set on the candidate')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('ID of the created candidate'),
      candidateUrl: z.string().optional().describe('Candidate API or profile URL'),
      profileUrl: z.string().optional().describe('Workable profile URL'),
      jobShortcode: z.string().optional().describe('Associated job shortcode'),
      stage: z.string().optional().describe('Candidate stage'),
      status: z.string().describe('Creation status')
    })
  )
  .handleInvocation(async ctx => {
    let hasFullName = Boolean(ctx.input.name?.trim());
    let hasSplitName = Boolean(ctx.input.firstname?.trim() && ctx.input.lastname?.trim());

    if (!hasFullName && !hasSplitName) {
      throw createApiServiceError(
        'Provide either name or both firstname and lastname when creating a Workable candidate.'
      );
    }

    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let request = buildCandidateCreateRequest(ctx.input);
    let result = await client.createCandidate(
      ctx.input.jobShortcode,
      request.body,
      request.params
    );
    let candidate = unwrapCandidate(result);

    return {
      output: {
        candidateId: candidate.id,
        candidateUrl: candidate.url,
        profileUrl: candidate.profile_url,
        jobShortcode: candidate.job?.shortcode ?? ctx.input.jobShortcode,
        stage: candidate.stage,
        status: result.status || 'created'
      },
      message: `Created candidate **"${candidate.name || ctx.input.name || [ctx.input.firstname, ctx.input.lastname].filter(Boolean).join(' ')}"** for job ${ctx.input.jobShortcode}.`
    };
  })
  .build();
