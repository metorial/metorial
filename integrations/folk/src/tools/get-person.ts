import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieves a single person by their ID, returning all their details including name, contact info, group memberships, company associations, and custom field values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.string().describe('ID of the person to retrieve')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('ID of the person'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      fullName: z.string().describe('Full name'),
      description: z.string().describe('Description'),
      birthday: z.string().nullable().describe('Birthday'),
      jobTitle: z.string().describe('Job title'),
      emails: z.array(z.string()).describe('Email addresses'),
      phones: z.array(z.string()).describe('Phone numbers'),
      addresses: z.array(z.string()).describe('Addresses'),
      urls: z.array(z.string()).describe('URLs'),
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            groupName: z.string()
          })
        )
        .describe('Groups'),
      companies: z
        .array(
          z.object({
            companyId: z.string(),
            companyName: z.string()
          })
        )
        .describe('Associated companies'),
      customFieldValues: z.record(z.string(), z.unknown()).describe('Custom field values'),
      createdAt: z.string().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let person = await client.getPerson(ctx.input.personId);

    return {
      output: {
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: person.fullName,
        description: person.description,
        birthday: person.birthday,
        jobTitle: person.jobTitle,
        emails: person.emails,
        phones: person.phones,
        addresses: person.addresses,
        urls: person.urls,
        groups: person.groups.map(g => ({ groupId: g.id, groupName: g.name })),
        companies: person.companies.map(c => ({ companyId: c.id, companyName: c.name })),
        customFieldValues: person.customFieldValues,
        createdAt: person.createdAt
      },
      message: `Found person **${person.fullName}** (${person.id})`
    };
  })
  .build();
