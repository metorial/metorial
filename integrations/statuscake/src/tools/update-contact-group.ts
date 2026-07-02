import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContactGroup = SlateTool.create(spec, {
  name: 'Update Contact Group',
  key: 'update_contact_group',
  description: `Update an existing contact group. Modify name, email addresses, mobile numbers, integrations, and ping URL. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the contact group to update'),
      name: z.string().optional().describe('New name for the contact group'),
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses to receive alerts'),
      mobileNumbers: z
        .array(z.string())
        .optional()
        .describe('Mobile phone numbers in international format'),
      integrations: z
        .array(z.string())
        .optional()
        .describe('Integration IDs for third-party integrations'),
      pingUrl: z.string().optional().describe('Webhook URL to receive alert notifications')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { groupId, emailAddresses, mobileNumbers, pingUrl, ...rest } = ctx.input;

    let data: Record<string, any> = { ...rest };
    if (emailAddresses) data.email_addresses = emailAddresses;
    if (mobileNumbers) data.mobile_numbers = mobileNumbers;
    if (pingUrl !== undefined) data.ping_url = pingUrl;

    await client.updateContactGroup(groupId, data);

    return {
      output: { success: true },
      message: `Updated contact group **${groupId}** successfully.`
    };
  })
  .build();
