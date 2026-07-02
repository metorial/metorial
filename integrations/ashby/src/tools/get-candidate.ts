import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

export let getCandidateTool = SlateTool.create(spec, {
  name: 'Get Candidate',
  key: 'get_candidate',
  description: `Retrieves detailed information about a candidate. Can look up by ID or search by email/name. When searching by email or name, returns the first matching candidate.`,
  instructions: [
    'Provide at least one of candidateId, email, or name to look up a candidate.',
    'When candidateId is provided, it takes priority and fetches the candidate directly.',
    'When email or name is provided, a search is performed and the first match is returned.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      candidateId: z.string().optional().describe('Unique ID of the candidate to retrieve'),
      email: z.string().optional().describe('Email address to search for'),
      name: z.string().optional().describe('Name to search for')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Unique ID of the candidate'),
      name: z.string().describe('Full name of the candidate'),
      primaryEmail: z.string().optional().describe('Primary email address'),
      primaryPhone: z.string().optional().describe('Primary phone number'),
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Unique ID of the tag'),
            title: z.string().describe('Title of the tag')
          })
        )
        .describe('Tags associated with the candidate'),
      emails: z.array(z.string()).describe('All email addresses for the candidate'),
      phoneNumbers: z.array(z.string()).describe('All phone numbers for the candidate'),
      socialProfiles: z.array(z.string()).describe('Social profile URLs for the candidate'),
      locations: z.array(z.string()).describe('Location names for the candidate'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Unique ID of the custom field'),
            title: z.string().describe('Display name of the custom field'),
            value: z.any().describe('Value of the custom field')
          })
        )
        .describe('Custom field values set on the candidate'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });

    if (!ctx.input.candidateId && !ctx.input.email && !ctx.input.name) {
      throw new Error('At least one of candidateId, email, or name must be provided');
    }

    let candidate: any;

    if (ctx.input.candidateId) {
      let result = await client.getCandidate(ctx.input.candidateId);
      candidate = result.results;
    } else {
      let searchParams: { email?: string; name?: string } = {};
      if (ctx.input.email !== undefined) searchParams.email = ctx.input.email;
      if (ctx.input.name !== undefined) searchParams.name = ctx.input.name;

      let result = await client.searchCandidates(searchParams);
      let candidates = result.results;

      if (!candidates || candidates.length === 0) {
        throw new Error(`No candidate found matching the search criteria`);
      }

      candidate = candidates[0];
    }

    let output = {
      candidateId: candidate.id,
      name: candidate.name || '',
      primaryEmail: candidate.primaryEmailAddress?.value || undefined,
      primaryPhone: candidate.primaryPhoneNumber?.value || undefined,
      tags: (candidate.tags || []).map((t: any) => ({
        tagId: t.id,
        title: t.title || t.name || ''
      })),
      emails: (candidate.emailAddresses || []).map((e: any) => e.value || e),
      phoneNumbers: (candidate.phoneNumbers || []).map((p: any) => p.value || p),
      socialProfiles: (candidate.socialLinks || []).map((s: any) => s.url || s),
      locations: (candidate.locations || []).map((l: any) => l.name || l.location || l),
      customFields: (candidate.customFields || []).map((f: any) => ({
        fieldId: f.id || f.fieldId || '',
        title: f.title || f.name || '',
        value: f.value
      })),
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt
    };

    return {
      output,
      message: `Retrieved candidate **${output.name}**${output.primaryEmail ? ` (${output.primaryEmail})` : ''}`
    };
  })
  .build();
