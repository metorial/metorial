import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getContacts = SlateTool.create(spec, {
  name: 'Get Contacts',
  key: 'get_contacts',
  description: `Retrieves the authenticated user's contact list. Optionally includes pending incoming contact requests that can be approved or rejected.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeRequests: z
        .boolean()
        .optional()
        .describe(
          'Whether to also fetch pending incoming contact requests. Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          accountId: z.number().describe('Contact account ID'),
          name: z.string().describe('Contact display name'),
          chatworkId: z.string().describe('Chatwork ID'),
          organizationName: z.string().describe('Organization name'),
          department: z.string().describe('Department'),
          avatarImageUrl: z.string().describe('Avatar image URL'),
          roomId: z.number().describe('Direct message room ID with this contact')
        })
      ),
      pendingRequests: z
        .array(
          z.object({
            requestId: z.number().describe('Request ID for approval/rejection'),
            accountId: z.number().describe('Requester account ID'),
            name: z.string().describe('Requester name'),
            chatworkId: z.string().describe('Requester Chatwork ID'),
            organizationName: z.string().describe('Requester organization'),
            department: z.string().describe('Requester department'),
            message: z.string().describe('Message from the requester'),
            avatarImageUrl: z.string().describe('Requester avatar URL')
          })
        )
        .optional()
        .describe('Pending incoming contact requests if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let contacts = await client.getContacts();

    let pendingRequests = ctx.input.includeRequests
      ? (await client.getIncomingRequests()).map(r => ({
          requestId: r.request_id,
          accountId: r.account_id,
          name: r.name,
          chatworkId: r.chatwork_id,
          organizationName: r.organization_name,
          department: r.department,
          message: r.message,
          avatarImageUrl: r.avatar_image_url
        }))
      : undefined;

    return {
      output: {
        contacts: contacts.map(c => ({
          accountId: c.account_id,
          name: c.name,
          chatworkId: c.chatwork_id,
          organizationName: c.organization_name,
          department: c.department,
          avatarImageUrl: c.avatar_image_url,
          roomId: c.room_id
        })),
        pendingRequests
      },
      message: `Found **${contacts.length}** contacts${pendingRequests ? ` and **${pendingRequests.length}** pending requests` : ''}.`
    };
  })
  .build();
