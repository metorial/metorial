import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

let insightSchema = z.object({
  insightId: z.string().describe('Unique identifier for the insight'),
  name: z.string().describe('Human-readable insight name'),
  type: z.string().describe('Insight category (e.g., "SEC Filing", "News", "Social Media")'),
  subType: z
    .string()
    .describe('Specific insight subtype (e.g., "jobChange", "funding", "linkedin_post")'),
  variables: z
    .record(z.string(), z.any())
    .describe('Structured data associated with the insight')
});

let resolutionSchema = z.object({
  contactResolved: z.boolean().describe('Whether the contact was resolved'),
  contactCompanyResolved: z.boolean().describe('Whether the company was resolved'),
  contactCompanyUrl: z.string().optional().describe('Resolved company URL'),
  contactLinkedinUrl: z.string().optional().describe('Resolved LinkedIn URL'),
  contactEmail: z.string().optional().describe('Resolved email')
});

let userResolutionSchema = z.object({
  userResolved: z.boolean().describe('Whether the seller was resolved'),
  userCompanyResolved: z.boolean().describe('Whether the seller company was resolved'),
  userCompanyUrl: z.string().optional().describe('Resolved seller company URL'),
  userLinkedinUrl: z.string().optional().describe('Resolved seller LinkedIn URL'),
  userEmail: z.string().optional().describe('Resolved seller email')
});

export let generateInsights = SlateTool.create(spec, {
  name: 'Generate Insights',
  key: 'generate_insights',
  description: `Retrieve up to 25 ranked, personalized insights for a prospect. Insights cover both contact-level signals (job changes, LinkedIn posts, Twitter posts, podcast appearances, work milestones) and company-level signals (SEC filings, news, funding, hiring trends, tech stack, GitHub activity, earnings transcripts, and more).

Insights are ranked by relevance to both the prospect and the seller. Provide seller information for better insight ranking.`,
  instructions: [
    'At least one contact identifier is required: contactEmail, contactLinkedinUrl, or contactCompanyUrl.',
    'Provide userEmail or userLinkedinUrl to improve insight ranking based on seller relevance.',
    'Use insightSubtypes to filter for specific signal types (max 10 subtypes, returns up to 2 insights per subtype).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactEmail: z.string().optional().describe('Prospect email address'),
      contactLinkedinUrl: z.string().optional().describe('Prospect LinkedIn profile URL'),
      contactCompanyUrl: z.string().optional().describe('Prospect company website URL'),
      userEmail: z.string().optional().describe('Seller email for improved insight ranking'),
      userLinkedinUrl: z.string().optional().describe('Seller LinkedIn URL'),
      userCompanyUrl: z.string().optional().describe('Seller company URL'),
      insightSubtypes: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by specific insight subtypes (e.g., "jobChange", "funding", "linkedin_post"). Max 10 subtypes.'
        )
    })
  )
  .output(
    z.object({
      prospectResolution: resolutionSchema.describe('Resolution status for the prospect'),
      userResolution: userResolutionSchema.describe('Resolution status for the seller'),
      insights: z.array(insightSchema).describe('Ranked list of insights for the prospect'),
      insightCount: z.number().describe('Total number of insights returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token);

    ctx.info('Generating prospect insights...');

    let result = await client.generateInsights({
      contactEmail: ctx.input.contactEmail,
      contactLinkedinUrl: ctx.input.contactLinkedinUrl,
      contactCompanyUrl: ctx.input.contactCompanyUrl,
      userEmail: ctx.input.userEmail,
      userLinkedinUrl: ctx.input.userLinkedinUrl,
      userCompanyUrl: ctx.input.userCompanyUrl,
      insightSubtype: ctx.input.insightSubtypes
    });

    let insights = result.insights ?? [];

    return {
      output: {
        prospectResolution: result.details?.prospect ?? {
          contactResolved: false,
          contactCompanyResolved: false
        },
        userResolution: result.details?.user ?? {
          userResolved: false,
          userCompanyResolved: false
        },
        insights,
        insightCount: insights.length
      },
      message: `Retrieved **${insights.length}** insight(s) for the prospect. Contact resolved: **${result.details?.prospect?.contactResolved ?? false}**, Company resolved: **${result.details?.prospect?.contactCompanyResolved ?? false}**.`
    };
  })
  .build();
