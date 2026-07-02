import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

let partySchema = z.object({
  partyId: z.number().describe('Unique identifier of the party'),
  type: z.string().describe('Type of party: "person" or "organisation"'),
  firstName: z.string().optional().describe('First name (persons only)'),
  lastName: z.string().optional().describe('Last name (persons only)'),
  title: z.string().optional().describe('Title (e.g. Mr, Mrs, Dr)'),
  jobTitle: z.string().optional().describe('Job title'),
  about: z.string().optional().describe('Description or notes about the party'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  lastContactedAt: z.string().optional().describe('ISO 8601 timestamp of last contact'),
  organisation: z.any().optional().describe('Linked organisation details'),
  owner: z.any().optional().describe('Assigned owner user'),
  team: z.any().optional().describe('Assigned team'),
  emailAddresses: z.array(z.any()).optional().describe('Email addresses'),
  phoneNumbers: z.array(z.any()).optional().describe('Phone numbers'),
  addresses: z.array(z.any()).optional().describe('Physical addresses'),
  websites: z.array(z.any()).optional().describe('Website URLs'),
  tags: z.array(z.any()).optional().describe('Associated tags'),
  fields: z.array(z.any()).optional().describe('Custom field values'),
  pictureURL: z.string().optional().describe('Profile picture URL')
});

export let listParties = SlateTool.create(spec, {
  name: 'List Parties',
  key: 'list_parties',
  description: `List contacts (people and organisations) from Capsule CRM with pagination and optional filtering by modification date. Use embed options to include tags, custom fields, and organisation details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      since: z
        .string()
        .optional()
        .describe('ISO 8601 date to filter parties modified after this date'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page, 1-100 (default: 50)'),
      embed: z
        .array(z.enum(['tags', 'fields', 'organisation', 'missingImportantFields']))
        .optional()
        .describe('Additional data to embed in the response')
    })
  )
  .output(
    z.object({
      parties: z.array(partySchema).describe('List of parties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let result = await client.listParties({
      since: ctx.input.since,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      embed: ctx.input.embed
    });

    let parties = (result.parties || []).map((p: any) => ({
      partyId: p.id,
      type: p.type,
      firstName: p.firstName,
      lastName: p.lastName,
      title: p.title,
      jobTitle: p.jobTitle,
      about: p.about,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      lastContactedAt: p.lastContactedAt,
      organisation: p.organisation,
      owner: p.owner,
      team: p.team,
      emailAddresses: p.emailAddresses,
      phoneNumbers: p.phoneNumbers,
      addresses: p.addresses,
      websites: p.websites,
      tags: p.tags,
      fields: p.fields,
      pictureURL: p.pictureURL
    }));

    return {
      output: { parties },
      message: `Retrieved **${parties.length}** parties from Capsule CRM.`
    };
  })
  .build();
