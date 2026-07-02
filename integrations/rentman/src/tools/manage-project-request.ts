import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProjectRequest = SlateTool.create(spec, {
  name: 'Create Project Request',
  key: 'create_project_request',
  description: `Create a new project request in Rentman. Project requests can be sent from any source (website, CRM, etc.) and can be converted into full projects within Rentman.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Request name / title'),
      contact: z.string().optional().describe('Contact reference URI (e.g. "/contacts/123")'),
      contactPerson: z.string().optional().describe('Contact person reference URI'),
      contactEmail: z.string().optional().describe('Email of the requesting party'),
      contactPhone: z.string().optional().describe('Phone of the requesting party'),
      location: z.string().optional().describe('Event location'),
      start: z.string().optional().describe('Event start date/time (ISO 8601)'),
      end: z.string().optional().describe('Event end date/time (ISO 8601)'),
      memo: z.string().optional().describe('Additional notes / description')
    })
  )
  .output(
    z.object({
      requestId: z.number().describe('ID of the newly created project request'),
      name: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.contact) body.contact = ctx.input.contact;
    if (ctx.input.contactPerson) body.linked_contact_person = ctx.input.contactPerson;
    if (ctx.input.contactEmail) body.contact_email = ctx.input.contactEmail;
    if (ctx.input.contactPhone) body.contact_phone = ctx.input.contactPhone;
    if (ctx.input.location) body.location = ctx.input.location;
    if (ctx.input.start) body.start = ctx.input.start;
    if (ctx.input.end) body.end = ctx.input.end;
    if (ctx.input.memo) body.memo = ctx.input.memo;

    let result = await client.create('projectrequests', body);
    let r = result.data as any;

    return {
      output: {
        requestId: r.id,
        name: r.name,
        createdAt: r.created
      },
      message: `Created project request **${r.name}** (ID: ${r.id}).`
    };
  })
  .build();

export let updateProjectRequest = SlateTool.create(spec, {
  name: 'Update Project Request',
  key: 'update_project_request',
  description: `Update an existing project request in Rentman. Modify the name, dates, contact info, or notes.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      requestId: z.number().describe('ID of the project request'),
      name: z.string().optional().describe('Updated request name'),
      contact: z.string().optional().describe('Updated contact reference'),
      contactPerson: z.string().optional().describe('Updated contact person reference'),
      contactEmail: z.string().optional().describe('Updated email'),
      contactPhone: z.string().optional().describe('Updated phone'),
      location: z.string().optional().describe('Updated location'),
      start: z.string().optional().describe('Updated start date/time'),
      end: z.string().optional().describe('Updated end date/time'),
      memo: z.string().optional().describe('Updated notes')
    })
  )
  .output(
    z.object({
      requestId: z.number(),
      name: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.contact !== undefined) body.contact = ctx.input.contact;
    if (ctx.input.contactPerson !== undefined)
      body.linked_contact_person = ctx.input.contactPerson;
    if (ctx.input.contactEmail !== undefined) body.contact_email = ctx.input.contactEmail;
    if (ctx.input.contactPhone !== undefined) body.contact_phone = ctx.input.contactPhone;
    if (ctx.input.location !== undefined) body.location = ctx.input.location;
    if (ctx.input.start !== undefined) body.start = ctx.input.start;
    if (ctx.input.end !== undefined) body.end = ctx.input.end;
    if (ctx.input.memo !== undefined) body.memo = ctx.input.memo;

    let result = await client.update('projectrequests', ctx.input.requestId, body);
    let r = result.data as any;

    return {
      output: {
        requestId: r.id,
        name: r.name,
        updatedAt: r.modified
      },
      message: `Updated project request **${r.name}** (ID: ${r.id}).`
    };
  })
  .build();

export let deleteProjectRequest = SlateTool.create(spec, {
  name: 'Delete Project Request',
  key: 'delete_project_request',
  description: `Permanently delete a project request from Rentman.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      requestId: z.number().describe('ID of the project request to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.remove('projectrequests', ctx.input.requestId);

    return {
      output: { deleted: true },
      message: `Deleted project request with ID **${ctx.input.requestId}**.`
    };
  })
  .build();
