import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update Users',
  key: 'update_users',
  description: `Update one or more users in Connecteam. Can modify names, phone numbers, emails, custom fields, and archive/restore users. Also supports promoting a user to admin and archiving users. Only specified fields are updated; unspecified fields remain unchanged.`,
  constraints: [
    'Maximum 25 users per update request',
    'Cannot update email for admin-type users via API'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['update', 'archive', 'promote_to_admin']).describe('Action to perform'),
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID to update'),
            firstName: z.string().optional().describe('New first name'),
            lastName: z.string().optional().describe('New last name'),
            phoneNumber: z.string().optional().describe('New phone number in E.164 format'),
            emailAddress: z.string().optional().describe('New email address'),
            isArchived: z
              .boolean()
              .optional()
              .describe('Set true to archive, false to restore'),
            customFields: z
              .array(
                z.object({
                  customFieldId: z.number().describe('Custom field ID'),
                  value: z.any().describe('New field value')
                })
              )
              .optional()
              .describe('Custom field values to update')
          })
        )
        .optional()
        .describe('Users to update (for "update" action)'),
      archiveUserIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to archive (for "archive" action)'),
      promoteDetails: z
        .object({
          userId: z.number().describe('User ID to promote'),
          email: z.string().describe('Admin email address'),
          title: z.string().optional().describe('Admin title')
        })
        .optional()
        .describe('Promotion details (for "promote_to_admin" action)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result: any;

    if (ctx.input.action === 'update' && ctx.input.users) {
      result = await client.updateUsers(ctx.input.users);
      return {
        output: { result },
        message: `Updated **${ctx.input.users.length}** user(s).`
      };
    } else if (ctx.input.action === 'archive' && ctx.input.archiveUserIds) {
      result = await client.archiveUsers(ctx.input.archiveUserIds);
      return {
        output: { result },
        message: `Archived **${ctx.input.archiveUserIds.length}** user(s).`
      };
    } else if (ctx.input.action === 'promote_to_admin' && ctx.input.promoteDetails) {
      result = await client.promoteToAdmin(ctx.input.promoteDetails);
      return {
        output: { result },
        message: `Promoted user **${ctx.input.promoteDetails.userId}** to admin.`
      };
    }

    throw new Error('Invalid action or missing required fields for the specified action.');
  })
  .build();
