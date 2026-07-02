import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapCandidate } from '../lib/mappers';
import { spec } from '../spec';

export let getCandidateTool = SlateTool.create(spec, {
  name: 'Get Candidate',
  key: 'get_candidate',
  description: `Retrieve detailed information about a specific candidate by their ID. Returns full candidate profile including contact information, tags, custom fields, and associated applications.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      candidateId: z.string().describe('The Greenhouse candidate ID')
    })
  )
  .output(
    z.object({
      candidateId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      company: z.string().nullable(),
      title: z.string().nullable(),
      isPrivate: z.boolean(),
      photoUrl: z.string().nullable(),
      emailAddresses: z.array(z.object({ value: z.string(), type: z.string() })),
      phoneNumbers: z.array(z.object({ value: z.string(), type: z.string() })),
      addresses: z.array(z.object({ value: z.string(), type: z.string() })),
      websiteAddresses: z.array(z.object({ value: z.string(), type: z.string() })),
      socialMediaAddresses: z.array(z.object({ value: z.string(), type: z.string() })),
      tags: z.array(z.string()),
      applicationIds: z.array(z.string()),
      customFields: z.record(z.string(), z.any()),
      coordinatorId: z.string().nullable(),
      recruiterId: z.string().nullable(),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      lastActivity: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let raw = await client.getCandidate(Number.parseInt(ctx.input.candidateId, 10));
    let candidate = mapCandidate(raw);

    return {
      output: candidate,
      message: `Retrieved candidate **${candidate.firstName} ${candidate.lastName}** (ID: ${candidate.candidateId}).`
    };
  })
  .build();
