import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details such as name, email, phone, position, or status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email address'),
      phoneNumber: z.string().optional().describe('New phone number'),
      position: z.string().optional().describe('New position / job title'),
      contactStatusId: z.number().optional().describe('Contact status ID (e.g., 1 for Active)')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the updated contact'),
      firstName: z.string().describe('Updated first name'),
      lastName: z.string().describe('Updated last name'),
      raw: z.record(z.string(), z.any()).describe('Full updated contact object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) body.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) body.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phoneNumber !== undefined) body.phoneNumber = ctx.input.phoneNumber;
    if (ctx.input.position !== undefined) body.position = ctx.input.position;
    if (ctx.input.contactStatusId !== undefined)
      body.contactStatus = { id: ctx.input.contactStatusId };

    let result = await client.updateContact(ctx.input.contactId, body);

    return {
      output: {
        contactId: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        raw: result
      },
      message: `Updated contact **${result.firstName} ${result.lastName}** (ID: ${result.id}).`
    };
  })
  .build();
