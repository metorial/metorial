import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  contacts: z.array(
    z.object({
      contactId: z.string().describe('Contact ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      emails: z.array(z.string()).optional(),
      phones: z.array(z.string()).optional(),
      companyName: z.string().optional(),
      jobTitle: z.string().optional(),
      type: z.string().optional()
    })
  ),
  nextCursor: z.string().optional().describe('Cursor for the next page')
});

export let listContactsTool = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List shared and local contacts in your Dialpad account with cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ownerId: z.string().optional().describe('Filter contacts by owner user ID'),
      cursor: z.string().optional().describe('Pagination cursor from a previous request')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'list_contacts');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
