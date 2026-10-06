import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  email,
  invalid,
  optionalString,
  pageSchema,
  row,
  rows,
  str,
  text,
  unexpected,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

export let getCandidateTool = SlateTool.create(spec, {
  name: 'Get Candidate',
  key: 'get_candidate',
  description: `Gets the exact candidate by ID or by an unambiguous email/name search. Multiple matches require a refined search or an exact ID; visibility depends on API-key permissions.`,
  instructions: [
    'Provide at least one of candidateId, email, or name to look up a candidate.',
    'When candidateId is provided, it takes priority and fetches the candidate directly.',
    'Email/name search must return exactly one match; refine ambiguous results or provide candidateId.'
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
      location: z.record(z.string(), z.unknown()).nullable().optional(),
      customFieldsAvailable: z.boolean().optional(),
      applicationIds: z.array(z.string()).optional(),
      resumeFileHandle: z.record(z.string(), z.unknown()).nullable().optional(),
      fileHandles: z.array(z.record(z.string(), z.unknown())).optional(),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth);
    let candidateId = ctx.input.candidateId;
    if (candidateId === undefined) {
      if (ctx.input.email === undefined && ctx.input.name === undefined)
        invalid('Provide candidateId, email or name.');
      const matches = rows(
        (
          await client.post('/candidate.search', {
            email: ctx.input.email === undefined ? undefined : email(ctx.input.email),
            name:
              ctx.input.name === undefined ? undefined : text(ctx.input.name, 'Search name'),
            limit: 100
          })
        ).results
      );
      if (matches.length === 0)
        invalid(
          'No visible candidate matched. Check permissions or select an exact candidate ID.'
        );
      if (matches.length !== 1)
        invalid(
          'Candidate search is ambiguous. Use list_organization candidates or refine the search, then provide the exact candidateId.'
        );
      candidateId = str(matches[0]?.id);
    }
    const candidate = row((await client.getCandidate(candidateId)).results);
    const location =
      candidate.location === null || candidate.location === undefined
        ? undefined
        : row(candidate.location);
    const fields = candidate.customFields === undefined ? [] : rows(candidate.customFields);
    return {
      output: {
        candidateId: str(candidate.id),
        name: str(candidate.name),
        primaryEmail:
          candidate.primaryEmailAddress === null
            ? undefined
            : optionalString(row(candidate.primaryEmailAddress).value),
        primaryPhone:
          candidate.primaryPhoneNumber === null
            ? undefined
            : optionalString(row(candidate.primaryPhoneNumber).value),
        tags: rows(candidate.tags).map(t => ({ tagId: str(t.id), title: str(t.title) })),
        emails: rows(candidate.emailAddresses).map(e => str(e.value)),
        phoneNumbers: rows(candidate.phoneNumbers).map(p => str(p.value)),
        socialProfiles: rows(candidate.socialLinks).map(s => str(s.url)),
        locations: location
          ? [
              Object.values(location)
                .filter(v => typeof v === 'string' && v)
                .join(', ')
            ]
          : [],
        location:
          candidate.location === undefined || candidate.location === null
            ? candidate.location
            : row(candidate.location),
        customFields: fields.map(f => ({
          fieldId: str(f.id),
          title: str(f.title),
          value: f.value
        })),
        customFieldsAvailable: candidate.customFields !== undefined,
        applicationIds: Array.isArray(candidate.applicationIds)
          ? candidate.applicationIds.map(str)
          : unexpected(),
        resumeFileHandle:
          candidate.resumeFileHandle === null ? null : row(candidate.resumeFileHandle),
        fileHandles: rows(candidate.fileHandles),
        createdAt: str(candidate.createdAt),
        updatedAt: str(candidate.updatedAt),
        warnings: client.warnings
      },
      message: 'Retrieved the exact visible candidate.'
    };
  })
  .build();
