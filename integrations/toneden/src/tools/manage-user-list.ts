import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  email: z.string().optional().describe('Contact email address'),
  phone: z.string().optional().describe('Contact phone number'),
  firstName: z.string().optional().describe('Contact first name'),
  lastName: z.string().optional().describe('Contact last name'),
  city: z.string().optional().describe('Contact city'),
  state: z.string().optional().describe('Contact state'),
  country: z.string().optional().describe('Contact country'),
  zip: z.string().optional().describe('Contact zip code'),
  gender: z.string().optional().describe('Contact gender')
});

let userListSchema = z.object({
  userListId: z.number().describe('Unique user list ID'),
  externalId: z.string().optional().describe('Facebook custom audience external ID'),
  externalAdAccountId: z.string().optional().describe('Facebook ad account ID'),
  name: z.string().optional().describe('List name'),
  userId: z.number().optional().describe('Owner user ID'),
  type: z.string().optional().describe('List type')
});

export let manageUserList = SlateTool.create(spec, {
  name: 'Manage User List',
  key: 'manage_user_list',
  description: `Create custom user lists for ad targeting, list existing user lists, and add or remove contacts from a list.
User lists are linked to Facebook custom audiences and can be used for targeting in ad campaigns.`,
  instructions: [
    'Use action "list" to see all user lists for the profile.',
    'Use action "create" to create a new user list linked to a Facebook ad account.',
    'Use action "update_contacts" to add or remove contacts from an existing list.'
  ],
  constraints: ['This feature may require contacting ToneDen support for access.']
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update_contacts']).describe('Operation to perform'),
      userListId: z
        .number()
        .optional()
        .describe('User list ID (required for update_contacts)'),
      externalAdAccountId: z
        .string()
        .optional()
        .describe('Facebook ad account ID (required for create)'),
      contactsToAdd: z.array(contactSchema).optional().describe('Contacts to add to the list'),
      contactsToRemove: z
        .array(contactSchema)
        .optional()
        .describe('Contacts to remove from the list')
    })
  )
  .output(
    z.object({
      userLists: z
        .array(userListSchema)
        .optional()
        .describe('List of user lists (for list action)'),
      userList: userListSchema.optional().describe('Created user list (for create action)'),
      contactsUpdated: z
        .boolean()
        .optional()
        .describe('Whether contacts were updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    let mapList = (l: any) => ({
      userListId: l.id,
      externalId: l.external_id,
      externalAdAccountId: l.external_ad_account_id,
      name: l.name,
      userId: l.user_id,
      type: l.type
    });

    if (action === 'list') {
      let lists = await client.listUserLists('me');
      return {
        output: { userLists: (lists || []).map(mapList) },
        message: `Found **${(lists || []).length}** user list(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.externalAdAccountId)
        throw new Error('externalAdAccountId is required for create action');
      let list = await client.createUserList({
        external_ad_account_id: ctx.input.externalAdAccountId,
        type: 'manual'
      });
      return {
        output: { userList: mapList(list) },
        message: `Created user list **"${list.name}"** (ID: ${list.id}).`
      };
    }

    // update_contacts
    if (!ctx.input.userListId)
      throw new Error('userListId is required for update_contacts action');

    let mapContact = (c: any) => {
      let contact: Record<string, any> = {};
      if (c.email) contact.email = c.email;
      if (c.phone) contact.phone = c.phone;
      if (c.firstName) contact.first_name = c.firstName;
      if (c.lastName) contact.last_name = c.lastName;
      if (c.city) contact.city = c.city;
      if (c.state) contact.state = c.state;
      if (c.country) contact.country = c.country;
      if (c.zip) contact.zip = c.zip;
      if (c.gender) contact.gender = c.gender;
      return contact;
    };

    let payload: { add?: Record<string, any>[]; remove?: Record<string, any>[] } = {};
    if (ctx.input.contactsToAdd) payload.add = ctx.input.contactsToAdd.map(mapContact);
    if (ctx.input.contactsToRemove)
      payload.remove = ctx.input.contactsToRemove.map(mapContact);

    await client.updateUserListContacts(ctx.input.userListId, payload);
    return {
      output: { contactsUpdated: true },
      message: `Updated contacts for user list **${ctx.input.userListId}**: ${ctx.input.contactsToAdd?.length ?? 0} added, ${ctx.input.contactsToRemove?.length ?? 0} removed.`
    };
  })
  .build();
