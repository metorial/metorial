import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing person (contact) in Pipeline CRM. Any provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      title: z.string().optional().describe('Updated job title'),
      type: z.enum(['Contact', 'Lead']).optional().describe('Updated person type'),
      companyId: z.number().optional().describe('New associated company ID'),
      companyName: z.string().optional().describe('Company name to associate'),
      userId: z.number().optional().describe('New owner user ID'),
      sourceId: z.number().optional().describe('Updated lead source ID'),
      summary: z.string().optional().describe('Updated notes and talking points'),
      address: z.string().optional().describe('Updated address'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by custom_label_<id>')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the updated person'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      email: z.string().nullable().optional().describe('Email address'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
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

    let person = await client.updatePerson(ctx.input.personId, personData);

    let fullName =
      [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Unknown';

    return {
      output: {
        personId: person.id,
        firstName: person.first_name ?? null,
        lastName: person.last_name ?? null,
        email: person.email ?? null,
        updatedAt: person.updated_at ?? null
      },
      message: `Updated person **${fullName}**`
    };
  })
  .build();
