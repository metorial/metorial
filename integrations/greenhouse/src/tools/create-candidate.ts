import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { candidateOutputSchema, mapCandidate } from '../lib/mappers';
import { spec } from '../spec';
export const createCandidateTool = SlateTool.create(spec, {
  key: 'create_candidate',
  name: 'Create Candidate',
  description:
    'Create a candidate, optionally with one application. Harvest v3 supports at most one job ID and untyped socialMediaUrls; legacy typed socialMediaAddresses require migration.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      socialMediaUrls: z
        .array(z.string())
        .optional()
        .describe(
          'Untyped social profile values supported by Harvest v3. Use instead of legacy socialMediaAddresses.'
        ),
      firstName: z.string().describe('Candidate first name'),
      lastName: z.string().describe('Candidate last name'),
      company: z.string().optional().describe('Current company'),
      title: z.string().optional().describe('Current title'),
      emailAddresses: z
        .array(
          z.object({
            value: z.string().describe('Email address'),
            type: z.enum(['personal', 'work', 'other']).describe('Email type')
          })
        )
        .optional()
        .describe('Email addresses'),
      phoneNumbers: z
        .array(
          z.object({
            value: z.string().describe('Phone number'),
            type: z.enum(['home', 'work', 'mobile', 'skype', 'other']).describe('Phone type')
          })
        )
        .optional()
        .describe('Phone numbers'),
      websiteAddresses: z
        .array(
          z.object({
            value: z.string().describe('Website URL'),
            type: z
              .enum(['personal', 'company', 'portfolio', 'blog', 'other'])
              .describe('Website type')
          })
        )
        .optional()
        .describe('Website addresses'),
      socialMediaAddresses: z
        .array(
          z.object({
            value: z.string().describe('Social media profile URL'),
            type: z.string().describe('Platform name (e.g., linkedin, twitter, github)')
          })
        )
        .optional()
        .describe('Social media profiles'),
      addresses: z
        .array(
          z.object({
            value: z.string().describe('Physical address'),
            type: z.enum(['home', 'work', 'other']).describe('Address type')
          })
        )
        .optional()
        .describe('Physical addresses'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the candidate'),
      jobIds: z
        .array(z.string())
        .optional()
        .describe('At most one job ID. Harvest v3 creates one application in this request.')
    })
  )
  .output(candidateOutputSchema)
  .handleInvocation(async ctx => {
    const result = await new GreenhouseClient(ctx.auth, ctx.config).createCandidate(ctx.input);
    return {
      output: {
        ...mapCandidate(result.candidate),
        applicationIds: result.application ? [String(result.application.id)] : undefined
      },
      message: 'Created the candidate. Review Greenhouse before retrying an ambiguous result.'
    };
  })
  .build();
