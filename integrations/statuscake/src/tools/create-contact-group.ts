import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContactGroup = SlateTool.create(spec, {
  name: 'Create Contact Group',
  key: 'create_contact_group',
  description: `Create a new contact group for alert routing. Contact groups can include email addresses, mobile phone numbers (international format), integration IDs, and a ping URL for webhook-style notifications.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the contact group'),
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses to receive alerts'),
      mobileNumbers: z
        .array(z.string())
        .optional()
        .describe('Mobile phone numbers in international format for SMS alerts'),
      integrations: z
        .array(z.string())
        .optional()
        .describe('Integration IDs for third-party integrations'),
      pingUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive alert notifications via HTTP POST')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the newly created contact group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { emailAddresses, mobileNumbers, pingUrl, ...rest } = ctx.input;

    let data: Record<string, any> = { ...rest };
    if (emailAddresses) data.email_addresses = emailAddresses;
    if (mobileNumbers) data.mobile_numbers = mobileNumbers;
    if (pingUrl !== undefined) data.ping_url = pingUrl;

    let result = await client.createContactGroup(data);
    let groupId = String(result?.data?.new_id ?? result?.new_id ?? '');

    return {
      output: { groupId },
      message: `Created contact group **${ctx.input.name}** (ID: ${groupId}).`
    };
  })
  .build();
