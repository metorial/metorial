import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  firstName: z.string().optional().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  role: z
    .string()
    .optional()
    .describe('Recipient role in the document (must match a role defined in the template)'),
  signingOrder: z.number().optional().describe('Signing order for the recipient (1-based)')
});

let tokenSchema = z.object({
  name: z.string().describe('Token name as defined in the template'),
  value: z.string().describe('Value to populate the token with')
});

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Create a new PandaDoc document from a template, populating it with recipients, tokens, fields, metadata, and pricing data. The document is created in draft status and can then be sent for signing.`,
  instructions: [
    'The templateId must be the UUID of an existing PandaDoc template.',
    'Recipient roles must match the roles defined in the template.',
    'After creation, the document transitions from "uploaded" to "draft" status within a few seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe('UUID of the PandaDoc template to create the document from'),
      name: z
        .string()
        .optional()
        .describe('Document name. Overrides the template name if provided.'),
      recipients: z
        .array(recipientSchema)
        .describe('List of document recipients (signers, approvers, CC)'),
      tokens: z
        .array(tokenSchema)
        .optional()
        .describe('Template tokens to populate with values'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields to pre-fill, keyed by field name with their values'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata to attach to the document'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the document'),
      folderUuid: z
        .string()
        .optional()
        .describe('UUID of the folder to place the document in'),
      ownerEmail: z.string().optional().describe('Email of the document owner'),
      detectTitleVariables: z
        .boolean()
        .optional()
        .describe('Whether to resolve variables in the document title'),
      pricingTables: z
        .array(z.any())
        .optional()
        .describe('Pricing table data to populate in the document'),
      contentPlaceholders: z
        .array(
          z.object({
            blockId: z.string().describe('Content placeholder block ID from the template'),
            contentLibraryItems: z
              .array(
                z.object({
                  contentLibraryItemId: z.string().describe('Content library item UUID')
                })
              )
              .describe('Content library items to insert')
          })
        )
        .optional()
        .describe('Content placeholders to fill with content library items')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('UUID of the created document'),
      documentName: z.string().describe('Name of the created document'),
      status: z.string().describe('Current status of the document'),
      dateCreated: z.string().describe('ISO 8601 timestamp of when the document was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let fieldsPayload: Record<string, { value: any }> | undefined;
    if (ctx.input.fields) {
      fieldsPayload = {};
      for (let [key, value] of Object.entries(ctx.input.fields)) {
        fieldsPayload[key] = { value };
      }
    }

    let contentPlaceholders = ctx.input.contentPlaceholders?.map(cp => ({
      block_id: cp.blockId,
      content_library_items: cp.contentLibraryItems.map(item => ({
        id: item.contentLibraryItemId
      }))
    }));

    let result = await client.createDocument({
      template_uuid: ctx.input.templateId,
      name: ctx.input.name,
      recipients: ctx.input.recipients.map(r => ({
        email: r.email,
        first_name: r.firstName,
        last_name: r.lastName,
        role: r.role,
        signing_order: r.signingOrder
      })),
      tokens: ctx.input.tokens?.map(t => ({ name: t.name, value: t.value })),
      fields: fieldsPayload,
      metadata: ctx.input.metadata,
      tags: ctx.input.tags,
      folder_uuid: ctx.input.folderUuid,
      owner: ctx.input.ownerEmail ? { email: ctx.input.ownerEmail } : undefined,
      detect_title_variables: ctx.input.detectTitleVariables,
      pricing_tables: ctx.input.pricingTables,
      content_placeholders: contentPlaceholders
    });

    return {
      output: {
        documentId: result.id || result.uuid,
        documentName: result.name,
        status: result.status,
        dateCreated: result.date_created
      },
      message: `Created document **${result.name}** (ID: \`${result.id || result.uuid}\`) with status \`${result.status}\`.`
    };
  })
  .build();
