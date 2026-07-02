import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapCandidate } from '../lib/mappers';
import { spec } from '../spec';

export let createCandidateTool = SlateTool.create(spec, {
  name: 'Create Candidate',
  key: 'create_candidate',
  description: `Create a new candidate in Greenhouse. You can optionally associate the candidate with one or more jobs by providing application job IDs. Requires the **On-Behalf-Of** user ID in config.`,
  constraints: ['Requires the onBehalfOf config value to be set for audit purposes.'],
  tags: { readOnly: false }
})
  .input(
    z.object({
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
        .describe('Job IDs to create applications for this candidate')
    })
  )
  .output(
    z.object({
      candidateId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      company: z.string().nullable(),
      title: z.string().nullable(),
      emailAddresses: z.array(z.object({ value: z.string(), type: z.string() })),
      phoneNumbers: z.array(z.object({ value: z.string(), type: z.string() })),
      tags: z.array(z.string()),
      applicationIds: z.array(z.string()),
      createdAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });

    let raw = await client.createCandidate({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      company: ctx.input.company,
      title: ctx.input.title,
      emailAddresses: ctx.input.emailAddresses,
      phoneNumbers: ctx.input.phoneNumbers,
      websiteAddresses: ctx.input.websiteAddresses,
      socialMediaAddresses: ctx.input.socialMediaAddresses,
      addresses: ctx.input.addresses,
      tags: ctx.input.tags,
      applications: ctx.input.jobIds?.map(id => ({ jobId: Number.parseInt(id, 10) }))
    });

    let candidate = mapCandidate(raw);

    return {
      output: candidate,
      message: `Created candidate **${candidate.firstName} ${candidate.lastName}** (ID: ${candidate.candidateId}).`
    };
  })
  .build();
