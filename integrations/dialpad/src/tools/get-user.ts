import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  userId: z.string().describe('User ID'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  emails: z.array(z.string()).optional(),
  phoneNumbers: z.array(z.string()).optional(),
  extension: z.string().optional(),
  state: z.string().optional(),
  isAdmin: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
  isOnline: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  doNotDisturb: z.boolean().optional(),
  onDutyStatus: z.string().optional(),
  officeId: z.string().optional(),
  companyId: z.string().optional(),
  license: z.string().optional(),
  timezone: z.string().optional(),
  jobTitle: z.string().optional(),
  imageUrl: z.string().optional(),
  dateAdded: z.string().optional()
});

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific Dialpad user by their ID. Returns profile, status, contact info, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe('The Dialpad user ID. Use "me" to get the authenticated user.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'get_user');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
