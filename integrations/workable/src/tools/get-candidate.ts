import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let getCandidateTool = SlateTool.create(spec, {
  name: 'Get Candidate Details',
  key: 'get_candidate',
  description: `Retrieve full details for a specific candidate in a job, including their profile, answers to custom questions, tags, social profiles, education, experience, and optionally their activity feed and offer details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobShortcode: z.string().describe('The shortcode of the job the candidate belongs to'),
      candidateId: z.string().describe('The candidate ID'),
      includeActivities: z
        .boolean()
        .optional()
        .describe('Also fetch the candidate activity feed'),
      includeOffer: z.boolean().optional().describe('Also fetch the candidate offer details')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Candidate ID'),
      name: z.string().describe('Full name'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      headline: z.string().optional().describe('Candidate headline'),
      email: z.string().optional().describe('Primary email'),
      phone: z.string().optional().describe('Phone number'),
      address: z.string().optional().describe('Address'),
      stage: z.string().optional().describe('Current pipeline stage'),
      disqualified: z.boolean().optional().describe('Whether disqualified'),
      disqualificationReason: z.string().optional().describe('Disqualification reason'),
      sourced: z.boolean().optional().describe('Whether sourced'),
      profileUrl: z.string().optional().describe('Workable profile URL'),
      imageUrl: z.string().optional().describe('Profile image URL'),
      tags: z.array(z.string()).optional().describe('Candidate tags'),
      socialProfiles: z
        .array(
          z.object({
            type: z.string().describe('Social network type'),
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
      answers: z
        .array(
          z.object({
            questionKey: z.string().optional(),
            label: z.string().optional(),
            body: z.any().optional()
          })
        )
        .optional()
        .describe('Answers to custom questions'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      activities: z
        .array(
          z.object({
            activityId: z.string().optional(),
            action: z.string().optional(),
            body: z.string().optional(),
            createdAt: z.string().optional(),
            memberName: z.string().optional()
          })
        )
        .optional()
        .describe('Activity feed entries'),
      offer: z.any().optional().describe('Offer details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.getCandidate(ctx.input.jobShortcode, ctx.input.candidateId);
    let c = result.candidate || result;

    let output: any = {
      candidateId: c.id,
      name: c.name,
      firstname: c.firstname,
      lastname: c.lastname,
      headline: c.headline,
      email: c.email,
      phone: c.phone,
      address: c.address,
      stage: c.stage,
      disqualified: c.disqualified,
      disqualificationReason: c.disqualification_reason,
      sourced: c.sourced,
      profileUrl: c.profile_url,
      imageUrl: c.image_url,
      tags: c.tags,
      socialProfiles: c.social_profiles?.map((sp: any) => ({
        type: sp.type,
        url: sp.url
      })),
      education: c.education_entries?.map((e: any) => ({
        school: e.school,
        degree: e.degree,
        fieldOfStudy: e.field_of_study,
        startDate: e.start_date,
        endDate: e.end_date
      })),
      experience: c.experience_entries?.map((e: any) => ({
        title: e.title,
        company: e.company,
        industry: e.industry,
        summary: e.summary,
        startDate: e.start_date,
        endDate: e.end_date,
        current: e.current
      })),
      answers: c.answers?.map((a: any) => ({
        questionKey: a.question_key,
        label: a.label,
        body: a.body
      })),
      createdAt: c.created_at,
      updatedAt: c.updated_at
    };

    if (ctx.input.includeActivities) {
      let activitiesResult = await client.getCandidateActivities(
        ctx.input.jobShortcode,
        ctx.input.candidateId
      );
      output.activities = (activitiesResult.activities || []).map((a: any) => ({
        activityId: a.id,
        action: a.action,
        body: a.body,
        createdAt: a.created_at,
        memberName: a.member?.name
      }));
    }

    if (ctx.input.includeOffer) {
      try {
        let offerResult = await client.getCandidateOffer(
          ctx.input.jobShortcode,
          ctx.input.candidateId
        );
        output.offer = offerResult;
      } catch {
        // Offer may not exist for this candidate
      }
    }

    return {
      output,
      message: `Retrieved candidate **"${output.name}"** in stage "${output.stage || 'unknown'}".`
    };
  })
  .build();
