import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let createCandidateTool = SlateTool.create(spec, {
  name: 'Create Candidate',
  key: 'create_candidate',
  description: `Add a new candidate to a specific job in Workable. Provide the candidate's basic information, and optionally include social profiles, education, experience, and answers to application questions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobShortcode: z.string().describe('The shortcode of the job to add the candidate to'),
      firstname: z.string().describe('Candidate first name'),
      lastname: z.string().describe('Candidate last name'),
      email: z.string().describe('Candidate email address'),
      phone: z.string().optional().describe('Phone number'),
      headline: z.string().optional().describe('Professional headline'),
      summary: z.string().optional().describe('Candidate summary'),
      address: z.string().optional().describe('Address'),
      stage: z.string().optional().describe('Pipeline stage slug to place the candidate in'),
      sourced: z
        .boolean()
        .optional()
        .describe('Whether this candidate was sourced (not applied)'),
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
      tags: z.array(z.string()).optional().describe('Tags to add to the candidate')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('ID of the created candidate'),
      status: z.string().describe('Creation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let candidatePayload: any = {
      candidate: {
        name: `${ctx.input.firstname} ${ctx.input.lastname}`,
        firstname: ctx.input.firstname,
        lastname: ctx.input.lastname,
        email: ctx.input.email,
        phone: ctx.input.phone,
        headline: ctx.input.headline,
        summary: ctx.input.summary,
        address: ctx.input.address,
        sourced: ctx.input.sourced,
        tags: ctx.input.tags,
        social_profiles: ctx.input.socialProfiles?.map(sp => ({
          type: sp.type,
          url: sp.url
        })),
        education_entries: ctx.input.education?.map(e => ({
          school: e.school,
          degree: e.degree,
          field_of_study: e.fieldOfStudy,
          start_date: e.startDate,
          end_date: e.endDate
        })),
        experience_entries: ctx.input.experience?.map(e => ({
          title: e.title,
          company: e.company,
          industry: e.industry,
          summary: e.summary,
          start_date: e.startDate,
          end_date: e.endDate,
          current: e.current
        }))
      }
    };

    if (ctx.input.stage) {
      candidatePayload.candidate.stage = ctx.input.stage;
    }

    let result = await client.createCandidate(ctx.input.jobShortcode, candidatePayload);

    return {
      output: {
        candidateId: result.candidate?.id || result.id,
        status: result.status || 'created'
      },
      message: `Created candidate **"${ctx.input.firstname} ${ctx.input.lastname}"** for job ${ctx.input.jobShortcode}.`
    };
  })
  .build();
