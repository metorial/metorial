import { SlateTool } from 'slates';
import { z } from 'zod';
import { formatContactForBatch, RemarketyClient } from '../lib/client';
import { spec } from '../spec';

let batchContactSchema = z.object({
  email: z.string().describe('Contact email address'),
  firstName: z.string().optional().describe('Contact first name'),
  lastName: z.string().optional().describe('Contact last name'),
  smsPhoneNumber: z.string().optional().describe('SMS phone number in E.164 format'),
  smsCountryCode: z.string().optional().describe('SMS country code'),
  acceptsMarketing: z
    .boolean()
    .optional()
    .describe('Whether the contact accepts email marketing'),
  acceptsSmsMarketing: z
    .boolean()
    .optional()
    .describe('Whether the contact accepts SMS marketing'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the contact'),
  properties: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Custom properties for the contact')
});

export let batchUploadContactsTool = SlateTool.create(spec, {
  name: 'Batch Upload Contacts',
  key: 'batch_upload_contacts',
  description: `Upload multiple contacts to Remarkety in a single batch. Supports creating new contacts and updating existing ones, with options to control tag merging behavior. Up to 100 contacts per batch.`,
  constraints: ['Maximum 100 contacts per batch request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z
        .array(batchContactSchema)
        .min(1)
        .max(100)
        .describe('Array of contact objects to upload (max 100)'),
      updateExisting: z
        .boolean()
        .optional()
        .describe(
          'If true, updates info for existing contacts. If false, only creates new contacts. Defaults to true.'
        ),
      appendTags: z
        .boolean()
        .optional()
        .describe(
          'If true, tags are appended to existing tags. If false, existing tags are replaced. Defaults to true.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the batch upload was successful'),
      contactCount: z.number().describe('Number of contacts included in the batch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemarketyClient({
      token: ctx.auth.token,
      storeId: ctx.auth.storeId,
      storeDomain: ctx.config.storeDomain,
      platform: ctx.config.platform
    });

    let formattedContacts = ctx.input.contacts.map(c =>
      formatContactForBatch(c as unknown as Record<string, unknown>)
    );

    ctx.info(`Uploading batch of ${formattedContacts.length} contacts`);

    await client.batchUploadContacts(formattedContacts, {
      updateExisting: ctx.input.updateExisting,
      appendTags: ctx.input.appendTags
    });

    return {
      output: {
        success: true,
        contactCount: formattedContacts.length
      },
      message: `Successfully uploaded **${formattedContacts.length}** contacts in batch.`
    };
  })
  .build();
