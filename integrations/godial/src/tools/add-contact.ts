import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addContact = SlateTool.create(spec, {
  name: 'Add Contact',
  key: 'add_contact',
  description: `Create a new contact (lead) in a GoDial calling list. The contact will be added to the specified list and can be assigned to agents based on the assignment mode. Use the **List Calling Lists** tool to get the target list ID.`,
  instructions: [
    'A listId and phone number are required. All other fields are optional.',
    'The assignmentMode controls how the contact is distributed to agents. Use "default" for standard assignment.'
  ]
})
  .input(
    z.object({
      listId: z.string().describe('ID of the calling list to add the contact to'),
      phone: z.string().describe('Primary phone number of the contact'),
      name: z.string().optional().describe('Full name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      secondPhone: z.string().optional().describe('Secondary phone number'),
      companyName: z.string().optional().describe('Company name of the contact'),
      note: z.string().optional().describe('Notes about the contact'),
      remarks: z.string().optional().describe('Remarks or tags for the contact'),
      extra: z.string().optional().describe('Additional custom data'),
      assignmentMode: z
        .string()
        .optional()
        .describe('How the contact should be assigned to agents (e.g. "default")')
    })
  )
  .output(
    z.object({
      contact: z.any().describe('The created contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addContact({
      listId: ctx.input.listId,
      phone: ctx.input.phone,
      name: ctx.input.name,
      email: ctx.input.email,
      secondPhone: ctx.input.secondPhone,
      companyName: ctx.input.companyName,
      note: ctx.input.note,
      remarks: ctx.input.remarks,
      extra: ctx.input.extra,
      assignmentMode: ctx.input.assignmentMode
    });

    return {
      output: { contact: result },
      message: `Contact **${ctx.input.name || ctx.input.phone}** added to list \`${ctx.input.listId}\`.`
    };
  })
  .build();
