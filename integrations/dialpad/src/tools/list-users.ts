import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  users: z.array(
    z.object({
      userId: z.string().describe('User ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      displayName: z.string().optional().describe('Display name'),
      emails: z.array(z.string()).optional().describe('Email addresses'),
      phoneNumbers: z.array(z.string()).optional().describe('Phone numbers'),
      state: z.string().optional().describe('User state'),
      isAdmin: z.boolean().optional().describe('Whether user is an admin'),
      officeId: z.string().optional().describe('Office ID'),
      license: z.string().optional().describe('License type')
    })
  ),
  nextCursor: z.string().optional().describe('Cursor for the next page')
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Dialpad company. Supports filtering by email or state and cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter users by email address'),
      state: z
        .enum(['active', 'pending', 'suspended', 'deleted'])
        .optional()
        .describe('Filter by user state'),
      cursor: z.string().optional().describe('Pagination cursor from a previous request')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'list_users');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
