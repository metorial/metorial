import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve detailed information about a specific person (contact) by their ID, including associated company, custom fields, and social media profiles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to retrieve')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('Unique person ID'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      fullName: z.string().nullable().optional().describe('Full name'),
      email: z.string().nullable().optional().describe('Email address'),
      phone: z.string().nullable().optional().describe('Phone number'),
      title: z.string().nullable().optional().describe('Job title'),
      type: z.string().nullable().optional().describe('Person type (Contact or Lead)'),
      companyId: z.number().nullable().optional().describe('Associated company ID'),
      companyName: z.string().nullable().optional().describe('Associated company name'),
      userId: z.number().nullable().optional().describe('Owner user ID'),
      sourceId: z.number().nullable().optional().describe('Lead source ID'),
      summary: z.string().nullable().optional().describe('Notes and talking points'),
      address: z.string().nullable().optional().describe('Address'),
      customFields: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Custom field values'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let person = await client.getPerson(ctx.input.personId);

    let fullName =
      person.full_name ??
      ([person.first_name, person.last_name].filter(Boolean).join(' ') || null);

    return {
      output: {
        personId: person.id,
        firstName: person.first_name ?? null,
        lastName: person.last_name ?? null,
        fullName,
        email: person.email ?? null,
        phone: person.phone ?? null,
        title: person.title ?? null,
        type: person.type ?? null,
        companyId: person.company_id ?? person.company?.id ?? null,
        companyName: person.company?.name ?? null,
        userId: person.user_id ?? person.owner_id ?? null,
        sourceId: person.source_id ?? person.source?.id ?? null,
        summary: person.summary ?? null,
        address: person.address ?? null,
        customFields: person.custom_fields ?? null,
        createdAt: person.created_at ?? null,
        updatedAt: person.updated_at ?? null
      },
      message:
        `Retrieved person **${fullName ?? 'Unknown'}**` +
        (person.email ? ` (${person.email})` : '')
    };
  })
  .build();
