import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z
  .object({
    cell: z.string().describe('Cell number of the contact'),
    firstname: z.string().optional().describe('First name'),
    lastname: z.string().optional().describe('Last name'),
    email: z.string().optional().describe('Email address'),
    c1: z.string().optional().describe('Custom field 1'),
    c2: z.string().optional().describe('Custom field 2'),
    c3: z.string().optional().describe('Custom field 3'),
    c4: z.string().optional().describe('Custom field 4'),
    c5: z.string().optional().describe('Custom field 5')
  })
  .passthrough();

export let uploadContacts = SlateTool.create(spec, {
  name: 'Upload Contacts',
  key: 'upload_contacts',
  description: `Upload contacts to Dripcel. Supports both create-only mode (up to 100,000 contacts) and upsert mode (up to 20,000 contacts) which creates new contacts and updates existing ones. Contacts can be tagged and optionally trigger an SMS send upon upload.`,
  instructions: [
    'Set upsert to true to update existing contacts, otherwise only new contacts are created.',
    'When using upsert mode, the limit is 20,000 contacts per request vs 100,000 for create-only.'
  ],
  constraints: [
    'Create-only: up to 100,000 contacts per request',
    'Upsert: up to 20,000 contacts per request'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contacts: z.array(contactSchema).describe('Array of contact objects to upload'),
      country: z.string().optional().describe('Country code (e.g. "ZA", "US")'),
      tagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs to assign to all uploaded contacts'),
      upsert: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, update existing contacts; if false, create only'),
      send: z
        .object({
          campaignId: z.string().describe('Campaign ID to trigger a send for'),
          content: z.string().optional().describe('SMS content to send')
        })
        .optional()
        .describe('Optionally trigger an SMS send upon upload')
    })
  )
  .output(
    z.object({
      validContacts: z.number().describe('Number of valid contacts processed'),
      invalidContacts: z.number().describe('Number of invalid contacts rejected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sendParam: Record<string, any> | undefined;
    if (ctx.input.send) {
      sendParam = { campaign_id: ctx.input.send.campaignId };
      if (ctx.input.send.content) sendParam.content = ctx.input.send.content;
    }

    let params = {
      contacts: ctx.input.contacts,
      country: ctx.input.country,
      tag_ids: ctx.input.tagIds,
      send: sendParam
    };

    let result = ctx.input.upsert
      ? await client.upsertContacts(params)
      : await client.createContacts(params);

    let valid = result.data?.validContacts ?? 0;
    let invalid = result.data?.invalidContacts ?? 0;
    return {
      output: { validContacts: valid, invalidContacts: invalid },
      message: `Uploaded contacts: **${valid}** valid, **${invalid}** invalid.`
    };
  })
  .build();
