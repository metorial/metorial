import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let managePersons = SlateTool.create(spec, {
  name: 'Manage Persons',
  key: 'manage_persons',
  description: `Create, update, or delete person contacts in Pipedrive. Persons are individual contacts who can be linked to organizations and deals.
Supports setting name, email, phone, organization, and custom fields.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      personId: z.number().optional().describe('Person ID (required for update and delete)'),
      name: z.string().optional().describe('Full name (required for create)'),
      email: z
        .array(
          z.object({
            value: z.string().describe('Email address'),
            primary: z.boolean().optional().describe('Whether this is the primary email'),
            label: z.string().optional().describe('Label (e.g. work, home)')
          })
        )
        .optional()
        .describe('Email addresses'),
      phone: z
        .array(
          z.object({
            value: z.string().describe('Phone number'),
            primary: z.boolean().optional().describe('Whether this is the primary phone'),
            label: z.string().optional().describe('Label (e.g. work, mobile, home)')
          })
        )
        .optional()
        .describe('Phone numbers'),
      organizationId: z.number().optional().describe('Organization ID to link'),
      visibleTo: z
        .enum(['1', '3', '5', '7'])
        .optional()
        .describe('Visibility: 1=owner, 3=group, 5=group+sub, 7=company'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by field API key')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('Person ID'),
      name: z.string().optional().describe('Person name'),
      primaryEmail: z.string().optional().nullable().describe('Primary email address'),
      primaryPhone: z.string().optional().nullable().describe('Primary phone number'),
      organizationName: z.string().optional().nullable().describe('Linked organization name'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      ownerName: z.string().optional().describe('Owner user name'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the person was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.personId)
        throw pipedriveServiceError('personId is required for delete action');
      await client.deletePerson(ctx.input.personId);
      return {
        output: { personId: ctx.input.personId, deleted: true },
        message: `Person **#${ctx.input.personId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.organizationId) body.org_id = ctx.input.organizationId;
    if (ctx.input.visibleTo) body.visible_to = ctx.input.visibleTo;
    if (ctx.input.customFields) {
      Object.assign(body, ctx.input.customFields);
    }

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createPerson(body);
    } else {
      if (!ctx.input.personId)
        throw pipedriveServiceError('personId is required for update action');
      result = await client.updatePerson(ctx.input.personId, body);
    }

    let person = result?.data;
    let action = ctx.input.action === 'create' ? 'created' : 'updated';

    let primaryEmail =
      person?.primary_email ??
      (Array.isArray(person?.email) ? person.email.find((e: any) => e.primary)?.value : null);
    let primaryPhone = Array.isArray(person?.phone)
      ? person.phone.find((p: any) => p.primary)?.value
      : null;

    return {
      output: {
        personId: person?.id,
        name: person?.name,
        primaryEmail,
        primaryPhone,
        organizationName: person?.org_id?.name ?? null,
        organizationId: person?.org_id?.value ?? person?.org_id ?? null,
        ownerName: person?.owner_name ?? person?.owner_id?.name,
        addTime: person?.add_time,
        updateTime: person?.update_time
      },
      message: `Person **"${person?.name}"** (ID: ${person?.id}) has been ${action}.`
    };
  });
