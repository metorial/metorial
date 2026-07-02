import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Creates a new person contact in your Folk workspace. Supports setting name, job title, emails, phones, addresses, URLs, birthday, description, company associations, and group memberships. Folk automatically checks for duplicates and merges if a match is found.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      fullName: z.string().optional().describe('Full name (used if first/last not provided)'),
      description: z.string().optional().describe('Short description or bio'),
      birthday: z.string().optional().describe('Birthday in YYYY-MM-DD format'),
      jobTitle: z.string().optional().describe('Job title or role'),
      groupIds: z.array(z.string()).optional().describe('Group IDs to add the person to'),
      companies: z
        .array(
          z.object({
            companyId: z.string().optional().describe('Existing company ID'),
            companyName: z.string().optional().describe('Company name (creates or links)')
          })
        )
        .optional()
        .describe('Companies to associate (first is primary)'),
      emails: z.array(z.string()).optional().describe('Email addresses (first is primary)'),
      phones: z.array(z.string()).optional().describe('Phone numbers (first is primary)'),
      addresses: z.array(z.string()).optional().describe('Addresses (first is primary)'),
      urls: z.array(z.string()).optional().describe('URLs (first is primary)'),
      customFieldValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values keyed by group ID')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('ID of the created person'),
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
        .describe('Associated companies'),
      createdAt: z.string().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, unknown> = {};
    if (ctx.input.firstName) input.firstName = ctx.input.firstName;
    if (ctx.input.lastName) input.lastName = ctx.input.lastName;
    if (ctx.input.fullName) input.fullName = ctx.input.fullName;
    if (ctx.input.description) input.description = ctx.input.description;
    if (ctx.input.birthday) input.birthday = ctx.input.birthday;
    if (ctx.input.jobTitle) input.jobTitle = ctx.input.jobTitle;
    if (ctx.input.emails) input.emails = ctx.input.emails;
    if (ctx.input.phones) input.phones = ctx.input.phones;
    if (ctx.input.addresses) input.addresses = ctx.input.addresses;
    if (ctx.input.urls) input.urls = ctx.input.urls;
    if (ctx.input.customFieldValues) input.customFieldValues = ctx.input.customFieldValues;
    if (ctx.input.groupIds) {
      input.groups = ctx.input.groupIds.map(id => ({ id }));
    }
    if (ctx.input.companies) {
      input.companies = ctx.input.companies.map(c => {
        if (c.companyId) return { id: c.companyId };
        return { name: c.companyName };
      });
    }

    let person = await client.createPerson(input);

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
        createdAt: person.createdAt
      },
      message: `Created person **${person.fullName}** (${person.id})`
    };
  })
  .build();
