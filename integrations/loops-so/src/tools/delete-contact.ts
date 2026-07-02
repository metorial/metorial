import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from your Loops audience. Identify the contact by email address or user ID.`,
  instructions: ['Provide either email or userId, not both.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the contact to delete'),
      userId: z.string().optional().describe('External user ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      statusMessage: z.string().describe('Confirmation message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteContact({
      email: ctx.input.email,
      userId: ctx.input.userId
    });

    let identifier = ctx.input.email || ctx.input.userId || 'unknown';
    return {
      output: {
        success: result.success,
        statusMessage: result.message
      },
      message: `Deleted contact **${identifier}**.`
    };
  })
  .build();
