import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let createCandidate = SlateTool.create(spec, {
  name: 'Create Candidate',
  key: 'create_candidate',
  description: `Create a new candidate in Recruitee. Optionally assign the candidate to one or more job offers or talent pools during creation. Supports setting contact details, social links, cover letter, and a remote CV URL.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the candidate'),
      emails: z.array(z.string()).optional().describe('Email addresses for the candidate'),
      phones: z.array(z.string()).optional().describe('Phone numbers for the candidate'),
      socialLinks: z
        .array(z.string())
        .optional()
        .describe('Social profile URLs (e.g., LinkedIn)'),
      links: z.array(z.string()).optional().describe('Other relevant URLs (e.g., portfolio)'),
      coverLetter: z.string().optional().describe('Cover letter text'),
      remoteCvUrl: z
        .string()
        .optional()
        .describe("Public URL to the candidate's CV/resume file"),
      sources: z
        .array(z.string())
        .optional()
        .describe('Sources for the candidate (e.g., "LinkedIn", "Referral")'),
      offerIds: z
        .array(z.number())
        .optional()
        .describe('IDs of job offers or talent pools to assign the candidate to')
    })
  )
  .output(
    z.object({
      candidateId: z.number().describe('ID of the created candidate'),
      name: z.string().describe('Name of the created candidate'),
      emails: z.array(z.string()).describe('Email addresses'),
      phones: z.array(z.string()).describe('Phone numbers'),
      createdAt: z.string().describe('Creation timestamp'),
      adminAppUrl: z.string().optional().describe('URL to view candidate in Recruitee admin')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let result = await client.createCandidate(
      {
        name: ctx.input.name,
        emails: ctx.input.emails,
        phones: ctx.input.phones,
        socialLinks: ctx.input.socialLinks,
        links: ctx.input.links,
        coverLetter: ctx.input.coverLetter,
        remoteCvUrl: ctx.input.remoteCvUrl,
        sources: ctx.input.sources
      },
      ctx.input.offerIds
    );

    let candidate = result.candidate;

    return {
      output: {
        candidateId: candidate.id,
        name: candidate.name,
        emails: candidate.emails || [],
        phones: candidate.phones || [],
        createdAt: candidate.created_at,
        adminAppUrl: candidate.adminapp_url
      },
      message: `Created candidate **${candidate.name}** (ID: ${candidate.id}).`
    };
  })
  .build();
