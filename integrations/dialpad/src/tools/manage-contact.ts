import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  contactId: z.string().describe('Contact ID'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  deleted: z.boolean().optional().describe('True if the contact was deleted')
});

export let manageContactTool = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, upsert, or delete a Dialpad contact. The **upsert** action uses an external unique identifier to create-or-update, which is useful for syncing contacts from external systems.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'upsert', 'delete'])
        .describe('Action to perform. "upsert" creates or updates based on the externalUid.'),
      contactId: z.string().optional().describe('Contact ID (required for update and delete)'),
      externalUid: z
        .string()
        .optional()
        .describe('External unique identifier for upsert operations'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phones: z.array(z.string()).optional().describe('Phone numbers'),
      emails: z.array(z.string()).optional().describe('Email addresses'),
      companyName: z.string().optional().describe('Company name'),
      jobTitle: z.string().optional().describe('Job title'),
      urls: z.array(z.string()).optional().describe('URLs associated with the contact')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'manage_contact');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
