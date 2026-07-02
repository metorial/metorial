import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOpportunityActivityTool = SlateTool.create(spec, {
  name: 'Get Opportunity Activity',
  key: 'get_opportunity_activity',
  description: `Retrieve activity for a specific opportunity including notes, feedback, interviews, offers, applications, resumes, and referrals. Select which types of activity to fetch.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      opportunityId: z.string().describe('ID of the opportunity'),
      include: z
        .array(
          z.enum([
            'notes',
            'feedback',
            'interviews',
            'offers',
            'applications',
            'resumes',
            'files',
            'referrals'
          ])
        )
        .describe('Types of activity to include')
    })
  )
  .output(
    z.object({
      notes: z.array(z.any()).optional().describe('Notes on the opportunity'),
      feedback: z.array(z.any()).optional().describe('Feedback forms'),
      interviews: z.array(z.any()).optional().describe('Interviews'),
      offers: z.array(z.any()).optional().describe('Offers'),
      applications: z.array(z.any()).optional().describe('Applications'),
      resumes: z.array(z.any()).optional().describe('Resumes'),
      files: z.array(z.any()).optional().describe('Files'),
      referrals: z.array(z.any()).optional().describe('Referrals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    let output: Record<string, any> = {};
    let parts: string[] = [];

    let fetches = ctx.input.include.map(async type => {
      if (type === 'notes') {
        let result = await client.listOpportunityNotes(ctx.input.opportunityId);
        output.notes = result.data || [];
        parts.push(`${(result.data || []).length} notes`);
      } else if (type === 'feedback') {
        let result = await client.listOpportunityFeedback(ctx.input.opportunityId);
        output.feedback = result.data || [];
        parts.push(`${(result.data || []).length} feedback`);
      } else if (type === 'interviews') {
        let result = await client.listOpportunityInterviews(ctx.input.opportunityId);
        output.interviews = result.data || [];
        parts.push(`${(result.data || []).length} interviews`);
      } else if (type === 'offers') {
        let result = await client.listOpportunityOffers(ctx.input.opportunityId);
        output.offers = result.data || [];
        parts.push(`${(result.data || []).length} offers`);
      } else if (type === 'applications') {
        let result = await client.listOpportunityApplications(ctx.input.opportunityId);
        output.applications = result.data || [];
        parts.push(`${(result.data || []).length} applications`);
      } else if (type === 'resumes') {
        let result = await client.listOpportunityResumes(ctx.input.opportunityId);
        output.resumes = result.data || [];
        parts.push(`${(result.data || []).length} resumes`);
      } else if (type === 'files') {
        let result = await client.listOpportunityFiles(ctx.input.opportunityId);
        output.files = result.data || [];
        parts.push(`${(result.data || []).length} files`);
      } else if (type === 'referrals') {
        let result = await client.listOpportunityReferrals(ctx.input.opportunityId);
        output.referrals = result.data || [];
        parts.push(`${(result.data || []).length} referrals`);
      }
    });

    await Promise.all(fetches);

    return {
      output: output as any,
      message: `Retrieved activity for opportunity **${ctx.input.opportunityId}**: ${parts.join(', ')}.`
    };
  })
  .build();
