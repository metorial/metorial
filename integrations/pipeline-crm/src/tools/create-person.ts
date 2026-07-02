import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new person (contact) in Pipeline CRM. People can be associated with companies and assigned to users. If a company name is provided and matches an existing company, the person is linked to it; otherwise a new company is created.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      title: z.string().optional().describe('Job title'),
      type: z.enum(['Contact', 'Lead']).optional().describe('Person type'),
      companyId: z.number().optional().describe('Associated company ID'),
      companyName: z.string().optional().describe('Company name to associate'),
      userId: z.number().optional().describe('Owner user ID'),
      sourceId: z.number().optional().describe('Lead source ID'),
      summary: z.string().optional().describe('Notes and talking points'),
      address: z.string().optional().describe('Address'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by custom_label_<id>')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the created person'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      email: z.string().nullable().optional().describe('Email address'),
      companyName: z.string().nullable().optional().describe('Associated company name'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let personData: Record<string, any> = {};

    if (ctx.input.firstName !== undefined) personData.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) personData.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) personData.email = ctx.input.email;
    if (ctx.input.phone !== undefined) personData.phone = ctx.input.phone;
    if (ctx.input.title !== undefined) personData.title = ctx.input.title;
    if (ctx.input.type !== undefined) personData.type = ctx.input.type;
    if (ctx.input.companyId !== undefined) personData.company_id = ctx.input.companyId;
    if (ctx.input.companyName !== undefined) personData.company_name = ctx.input.companyName;
    if (ctx.input.userId !== undefined) personData.user_id = ctx.input.userId;
    if (ctx.input.sourceId !== undefined) personData.source_id = ctx.input.sourceId;
    if (ctx.input.summary !== undefined) personData.summary = ctx.input.summary;
    if (ctx.input.address !== undefined) personData.address = ctx.input.address;
    if (ctx.input.customFields !== undefined)
      personData.custom_fields = ctx.input.customFields;

    let person = await client.createPerson(personData);

    let fullName =
      [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Unnamed';

    return {
      output: {
        personId: person.id,
        firstName: person.first_name ?? null,
        lastName: person.last_name ?? null,
        email: person.email ?? null,
        companyName: person.company?.name ?? null,
        createdAt: person.created_at ?? null
      },
      message: `Created person **${fullName}**${person.email ? ` (${person.email})` : ''}`
    };
  })
  .build();
