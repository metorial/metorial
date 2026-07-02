import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let getParty = SlateTool.create(spec, {
  name: 'Get Party',
  key: 'get_party',
  description: `Retrieve a single contact (person or organisation) by ID from Capsule CRM, including all their details such as email addresses, phone numbers, addresses, and websites.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      partyId: z.number().describe('ID of the party to retrieve'),
      embed: z
        .array(z.enum(['tags', 'fields', 'organisation', 'missingImportantFields']))
        .optional()
        .describe('Additional data to embed')
    })
  )
  .output(
    z.object({
      partyId: z.number().describe('Unique identifier of the party'),
      type: z.string().describe('Type: "person" or "organisation"'),
      firstName: z.string().optional().describe('First name (persons only)'),
      lastName: z.string().optional().describe('Last name (persons only)'),
      title: z.string().optional().describe('Title prefix'),
      jobTitle: z.string().optional().describe('Job title'),
      about: z.string().optional().describe('Description or notes'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
      lastContactedAt: z.string().optional().describe('ISO 8601 last contact timestamp'),
      organisation: z.any().optional().describe('Linked organisation'),
      owner: z.any().optional().describe('Assigned owner'),
      team: z.any().optional().describe('Assigned team'),
      emailAddresses: z.array(z.any()).optional().describe('Email addresses'),
      phoneNumbers: z.array(z.any()).optional().describe('Phone numbers'),
      addresses: z.array(z.any()).optional().describe('Physical addresses'),
      websites: z.array(z.any()).optional().describe('Website URLs'),
      tags: z.array(z.any()).optional().describe('Tags'),
      fields: z.array(z.any()).optional().describe('Custom field values'),
      pictureURL: z.string().optional().describe('Profile picture URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let p = await client.getParty(ctx.input.partyId, ctx.input.embed);

    let output = {
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
    };

    let name =
      p.type === 'person'
        ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
        : (p.name ?? `Party #${p.id}`);

    return {
      output,
      message: `Retrieved party **${name}** (${p.type}).`
    };
  })
  .build();
