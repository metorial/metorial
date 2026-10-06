import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { candidateOutputSchema, mapCandidate } from '../lib/mappers';
import { spec } from '../spec';
export const updateCandidateTool = SlateTool.create(spec, {
  key: 'update_candidate',
  name: 'Update Candidate',
  description:
    'Update only the supplied candidate fields. Contact arrays and tags replace their existing values. The authenticated v3 subject controls audit identity.',
  tags: { readOnly: false, destructive: true }
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
  .output(candidateOutputSchema)
  .handleInvocation(async ctx => {
    return {
      output: mapCandidate(
        await new GreenhouseClient(ctx.auth, ctx.config).updateCandidate(
          ctx.input.candidateId,
          ctx.input
        )
      ),
      message: 'Updated the requested candidate.'
    };
  })
  .build();
