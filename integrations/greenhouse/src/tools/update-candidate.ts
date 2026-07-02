import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapCandidate } from '../lib/mappers';
import { spec } from '../spec';

export let updateCandidateTool = SlateTool.create(spec, {
  name: 'Update Candidate',
  key: 'update_candidate',
  description: `Update an existing candidate's information in Greenhouse. Only provided fields will be updated. Requires the **On-Behalf-Of** user ID in config.`,
  constraints: ['Requires the onBehalfOf config value to be set for audit purposes.'],
  tags: { readOnly: false }
})
  .input(
    z.object({
      candidateId: z.string().describe('The Greenhouse candidate ID to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      company: z.string().optional().describe('Updated company name'),
      title: z.string().optional().describe('Updated title'),
      emailAddresses: z
        .array(
          z.object({
            value: z.string(),
            type: z.enum(['personal', 'work', 'other'])
          })
        )
        .optional()
        .describe('Updated email addresses (replaces existing)'),
      phoneNumbers: z
        .array(
          z.object({
            value: z.string(),
            type: z.enum(['home', 'work', 'mobile', 'skype', 'other'])
          })
        )
        .optional()
        .describe('Updated phone numbers (replaces existing)'),
      tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)')
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
      updatedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });

    let raw = await client.updateCandidate(Number.parseInt(ctx.input.candidateId, 10), {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      company: ctx.input.company,
      title: ctx.input.title,
      emailAddresses: ctx.input.emailAddresses,
      phoneNumbers: ctx.input.phoneNumbers,
      tags: ctx.input.tags
    });

    let candidate = mapCandidate(raw);

    return {
      output: candidate,
      message: `Updated candidate **${candidate.firstName} ${candidate.lastName}** (ID: ${candidate.candidateId}).`
    };
  })
  .build();
