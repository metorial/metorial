import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import {
  mapCandidateActivity,
  mapCandidateDetails,
  mapCandidateFile,
  unwrapCandidate
} from '../lib/shapes';
import { spec } from '../spec';

export let getCandidateTool = SlateTool.create(spec, {
  name: 'Get Candidate Details',
  key: 'get_candidate',
  description: `Retrieve a Workable candidate by candidate ID. Optionally include the candidate activity feed, files, and current offer details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      candidateId: z.string().describe('The candidate ID'),
      includeActivities: z
        .boolean()
        .optional()
        .describe('Also fetch the candidate activity feed'),
      activityLimit: z
        .number()
        .optional()
        .describe('Maximum number of activity records to fetch'),
      activitySinceId: z
        .string()
        .optional()
        .describe('Return activities with ID greater than this ID'),
      activityMaxId: z
        .string()
        .optional()
        .describe('Return activities with ID less than this ID'),
      activityActions: z
        .array(z.string())
        .optional()
        .describe('Filter activities by Workable action names'),
      activityUpdatedAfter: z
        .string()
        .optional()
        .describe('Only return activities updated after this ISO 8601 timestamp'),
      includeFiles: z.boolean().optional().describe('Also fetch candidate file metadata'),
      includeOffer: z.boolean().optional().describe('Also fetch candidate offer details')
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
      location: z.any().optional().describe('Candidate location'),
      stage: z.string().optional().describe('Current pipeline stage'),
      stageKind: z.string().optional().describe('Current pipeline stage kind'),
      jobShortcode: z.string().optional().describe('Associated job shortcode'),
      jobTitle: z.string().optional().describe('Associated job title'),
      disqualified: z.boolean().optional().describe('Whether disqualified'),
      withdrew: z.boolean().optional().describe('Whether withdrew'),
      disqualificationReason: z.string().optional().describe('Disqualification reason'),
      disqualifiedAt: z.string().optional().describe('Disqualification timestamp'),
      sourced: z.boolean().optional().describe('Whether sourced'),
      profileUrl: z.string().optional().describe('Workable profile URL'),
      imageUrl: z.string().optional().describe('Profile image URL'),
      coverLetter: z.string().optional().describe('Cover letter'),
      summary: z.string().optional().describe('Candidate summary'),
      skills: z.array(z.any()).optional().describe('Candidate skills'),
      resumeUrl: z.string().optional().describe('Resume URL'),
      resumeMetadata: z.any().optional().describe('Resume metadata'),
      tags: z.array(z.string()).optional().describe('Candidate tags'),
      socialProfiles: z.array(z.any()).optional().describe('Social profiles'),
      education: z.array(z.any()).optional().describe('Education entries'),
      experience: z.array(z.any()).optional().describe('Experience entries'),
      answers: z.array(z.any()).optional().describe('Answers to custom questions'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      activities: z.array(z.any()).optional().describe('Activity feed entries'),
      files: z.array(z.any()).optional().describe('Candidate file metadata'),
      offer: z.any().optional().describe('Offer details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let output: any = mapCandidateDetails(
      unwrapCandidate(await client.getCandidate(ctx.input.candidateId))
    );

    if (ctx.input.includeActivities) {
      let activitiesResult = await client.getCandidateActivities(ctx.input.candidateId, {
        limit: ctx.input.activityLimit,
        since_id: ctx.input.activitySinceId,
        max_id: ctx.input.activityMaxId,
        actions: ctx.input.activityActions?.join(','),
        updated_after: ctx.input.activityUpdatedAfter
      });
      output.activities = (activitiesResult.activities || []).map(mapCandidateActivity);
    }

    if (ctx.input.includeFiles) {
      let filesResult = await client.listCandidateFiles(ctx.input.candidateId);
      output.files = (filesResult.files || []).map(mapCandidateFile);
    }

    if (ctx.input.includeOffer) {
      try {
        output.offer = await client.getCandidateOffer(ctx.input.candidateId);
      } catch (error) {
        let message = error instanceof Error ? error.message : String(error);
        if (!/404|not found/i.test(message)) throw error;
      }
    }

    return {
      output,
      message: `Retrieved candidate **"${output.name}"** in stage "${output.stage || 'unknown'}".`
    };
  })
  .build();
