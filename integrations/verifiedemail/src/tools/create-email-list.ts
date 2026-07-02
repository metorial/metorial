import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmailList = SlateTool.create(spec, {
  name: 'Create Email List',
  key: 'create_email_list',
  description: `Create a new email list by uploading a set of email addresses. The list can then be verified in bulk using the "Verify Email List" tool.

Use this to prepare a batch of emails for bulk verification.`,
  instructions: [
    'Provide a descriptive name and an array of email addresses.',
    'After creation, use the "Verify Email List" tool to start the verification job.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('A descriptive name for the email list'),
      emails: z.array(z.string()).describe('Array of email addresses to add to the list')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique identifier of the created list'),
      name: z.string().describe('Name of the email list'),
      emailCount: z.number().describe('Total number of email addresses in the list'),
      verifiedCount: z.number().describe('Number of verified email addresses'),
      unverifiedCount: z.number().describe('Number of unverified email addresses'),
      status: z.string().describe('Current status of the list'),
      createdAt: z.string().describe('When the list was created'),
      updatedAt: z.string().describe('When the list was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress(
      `Creating email list "${ctx.input.name}" with ${ctx.input.emails.length} email(s)`
    );
    let list = await client.createList(ctx.input.name, ctx.input.emails);

    return {
      output: list,
      message: `Created email list **"${list.name}"** with **${list.emailCount}** email(s). List ID: \`${list.listId}\`. Status: **${list.status}**.`
    };
  })
  .build();
