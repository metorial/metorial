import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Updates an existing person in your Folk workspace. Supports partial updates to any field including name, job title, emails, phones, addresses, URLs, birthday, description, company associations, and group memberships.`,
  instructions: [
    'Array fields (emails, phones, addresses, urls, companies, groups) replace the entire list when provided — include all desired values, not just changes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.string().describe('ID of the person to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      fullName: z.string().optional().describe('Updated full name'),
      description: z.string().optional().describe('Updated description'),
      birthday: z
        .string()
        .nullable()
        .optional()
        .describe('Updated birthday (YYYY-MM-DD) or null to clear'),
      jobTitle: z.string().optional().describe('Updated job title'),
      groupIds: z.array(z.string()).optional().describe('Updated group IDs (replaces all)'),
      companies: z
        .array(
          z.object({
            companyId: z.string().optional().describe('Existing company ID'),
            companyName: z.string().optional().describe('Company name')
          })
        )
        .optional()
        .describe('Updated companies (replaces all, first is primary)'),
      emails: z.array(z.string()).optional().describe('Updated emails (replaces all)'),
      phones: z.array(z.string()).optional().describe('Updated phones (replaces all)'),
      addresses: z.array(z.string()).optional().describe('Updated addresses (replaces all)'),
      urls: z.array(z.string()).optional().describe('Updated URLs (replaces all)'),
      customFieldValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom field values keyed by group ID')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('ID of the updated person'),
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
        .describe('Groups the person belongs to'),
      companies: z
        .array(
          z.object({
            companyId: z.string(),
            companyName: z.string()
          })
        )
        .describe('Associated companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, unknown> = {};
    if (ctx.input.firstName !== undefined) input.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) input.lastName = ctx.input.lastName;
    if (ctx.input.fullName !== undefined) input.fullName = ctx.input.fullName;
    if (ctx.input.description !== undefined) input.description = ctx.input.description;
    if (ctx.input.birthday !== undefined) input.birthday = ctx.input.birthday;
    if (ctx.input.jobTitle !== undefined) input.jobTitle = ctx.input.jobTitle;
    if (ctx.input.emails !== undefined) input.emails = ctx.input.emails;
    if (ctx.input.phones !== undefined) input.phones = ctx.input.phones;
    if (ctx.input.addresses !== undefined) input.addresses = ctx.input.addresses;
    if (ctx.input.urls !== undefined) input.urls = ctx.input.urls;
    if (ctx.input.customFieldValues !== undefined)
      input.customFieldValues = ctx.input.customFieldValues;
    if (ctx.input.groupIds !== undefined) {
      input.groups = ctx.input.groupIds.map(id => ({ id }));
    }
    if (ctx.input.companies !== undefined) {
      input.companies = ctx.input.companies.map(c => {
        if (c.companyId) return { id: c.companyId };
        return { name: c.companyName };
      });
    }

    let person = await client.updatePerson(ctx.input.personId, input);

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
        companies: person.companies.map(c => ({ companyId: c.id, companyName: c.name }))
      },
      message: `Updated person **${person.fullName}** (${person.id})`
    };
  })
  .build();
