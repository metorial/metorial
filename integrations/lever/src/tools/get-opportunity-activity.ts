import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid, page, pagination, type Row } from '../lib/contracts';
import { spec } from '../spec';

export let getOpportunityActivityTool = SlateTool.create(spec, {
  name: 'Get Opportunity Activity',
  key: 'get_opportunity_activity',
  description: `Retrieve activity for a specific opportunity including notes, feedback, interviews, offers, applications, resumes, and referrals. Select which types of activity to fetch.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Page size from 1 to 100'),
      offset: z
        .string()
        .optional()
        .describe('Cursor for one selected resource type from its previous response'),
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
      pagination: z
        .record(z.string(), z.object({ hasNext: z.boolean(), next: z.string().optional() }))
        .optional()
        .describe('Paging state for each selected resource type'),
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
    const opportunityId = id(ctx.input.opportunityId, 'Opportunity ID');
    if (ctx.input.offset !== undefined && new Set(ctx.input.include).size !== 1)
      invalid(
        'A pagination cursor belongs to one resource type. Select exactly one type when using offset.'
      );
    if (!ctx.input.include.length) invalid('Choose at least one activity type.');
    const client = new Client(ctx.auth);
    const output: {
      notes?: Row[];
      feedback?: Row[];
      interviews?: Row[];
      offers?: Row[];
      applications?: Row[];
      resumes?: Row[];
      files?: Row[];
      referrals?: Row[];
      pagination: Record<string, { hasNext: boolean; next?: string }>;
    } = { pagination: {} };
    const methods = {
      notes: client.listOpportunityNotes.bind(client),
      feedback: client.listOpportunityFeedback.bind(client),
      interviews: client.listOpportunityInterviews.bind(client),
      offers: client.listOpportunityOffers.bind(client),
      applications: client.listOpportunityApplications.bind(client),
      resumes: client.listOpportunityResumes.bind(client),
      files: client.listOpportunityFiles.bind(client),
      referrals: client.listOpportunityReferrals.bind(client)
    };
    for (const type of new Set(ctx.input.include)) {
      const result = page(await methods[type](opportunityId, pagination(ctx.input)));
      output[type] = result.data;
      output.pagination[type] = { hasNext: result.hasNext, next: result.next };
    }
    return {
      output,
      message: `Retrieved the selected activity page for opportunity ${opportunityId}. Follow each activity type's cursor separately.`
    };
  })
  .build();
