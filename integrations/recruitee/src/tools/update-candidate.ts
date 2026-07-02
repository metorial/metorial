import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let updateCandidate = SlateTool.create(spec, {
  name: 'Update Candidate',
  key: 'update_candidate',
  description: `Update an existing candidate's profile information. Supports updating name, emails, phones, social links, cover letter, and CV. You can also update the CV separately via a remote URL.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.number().describe('ID of the candidate to update'),
      name: z.string().optional().describe('Updated full name'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Updated email addresses (replaces existing)'),
      phones: z
        .array(z.string())
        .optional()
        .describe('Updated phone numbers (replaces existing)'),
      socialLinks: z
        .array(z.string())
        .optional()
        .describe('Updated social profile URLs (replaces existing)'),
      links: z.array(z.string()).optional().describe('Updated other URLs (replaces existing)'),
      coverLetter: z.string().optional().describe('Updated cover letter text'),
      remoteCvUrl: z.string().optional().describe('New remote URL for CV/resume file')
    })
  )
  .output(
    z.object({
      candidateId: z.number().describe('ID of the updated candidate'),
      name: z.string().describe('Updated name'),
      emails: z.array(z.string()).describe('Email addresses'),
      phones: z.array(z.string()).describe('Phone numbers'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    // Update CV separately if provided
    if (ctx.input.remoteCvUrl) {
      await client.updateCandidateCv(ctx.input.candidateId, ctx.input.remoteCvUrl);
    }

    let result = await client.updateCandidate(ctx.input.candidateId, {
      name: ctx.input.name,
      emails: ctx.input.emails,
      phones: ctx.input.phones,
      socialLinks: ctx.input.socialLinks,
      links: ctx.input.links,
      coverLetter: ctx.input.coverLetter
    });

    let c = result.candidate;

    return {
      output: {
        candidateId: c.id,
        name: c.name,
        emails: c.emails || [],
        phones: c.phones || [],
        updatedAt: c.updated_at
      },
      message: `Updated candidate **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();
