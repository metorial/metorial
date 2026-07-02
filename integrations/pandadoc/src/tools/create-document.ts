import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { pandadocServiceError } from '../lib/errors';
import { spec } from '../spec';

let recipientSchema = z.object({
  email: z.string().optional().describe('Recipient email address'),
  phone: z
    .string()
    .optional()
    .describe('Recipient phone number. Required when creating SMS-only recipients.'),
  firstName: z.string().optional().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  company: z.string().optional().describe('Recipient company name'),
  role: z
    .string()
    .optional()
    .describe('Recipient role in the document (must match a role defined in the template)'),
  signingOrder: z.number().optional().describe('Signing order for the recipient (1-based)'),
  deliveryMethods: z
    .record(z.string(), z.boolean())
    .optional()
    .describe('Delivery methods to enable for this recipient, such as email or sms'),
  redirect: z
    .record(z.string(), z.any())
    .optional()
    .describe('Recipient redirect settings after completing the document')
});

let tokenSchema = z.object({
  name: z.string().describe('Token name as defined in the template'),
  value: z.string().describe('Value to populate the token with')
});

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Create a new PandaDoc document from a template or a publicly accessible PDF URL, populating it with recipients, tokens, fields, metadata, and content data. The document is created in draft status and can then be sent for signing.`,
  instructions: [
    'Use sourceType="template" with templateId for templates, or sourceType="pdf_url" with sourceUrl for a public PDF URL.',
    'Recipient roles must match roles defined in the template or PDF field mapping.',
    'Each recipient must include at least one of email or phone.',
    'After creation, the document transitions from "uploaded" to "draft" status within a few seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceType: z
        .enum(['template', 'pdf_url'])
        .optional()
        .describe(
          'Document source. Use "template" with templateId or "pdf_url" with sourceUrl. Defaults from the supplied source field.'
        ),
      templateId: z
        .string()
        .optional()
        .describe('UUID of the PandaDoc template to create the document from'),
      sourceUrl: z
        .string()
        .url()
        .optional()
        .describe('Publicly accessible PDF URL to create the document from'),
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
      ownerMembershipId: z.string().optional().describe('Membership ID of the document owner'),
      detectTitleVariables: z
        .boolean()
        .optional()
        .describe('Whether to resolve variables in the document title'),
      parseFormFields: z
        .boolean()
        .optional()
        .describe('Whether PandaDoc should parse form fields from a PDF URL source'),
      pricingTables: z
        .array(z.any())
        .optional()
        .describe('Pricing table data to populate in the document'),
      tables: z.array(z.any()).optional().describe('Table data to populate in the document'),
      texts: z
        .array(z.any())
        .optional()
        .describe('Text block data to populate in the document'),
      images: z
        .array(z.any())
        .optional()
        .describe('Image block data to populate in the document'),
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

    let sourceType = ctx.input.sourceType ?? (ctx.input.templateId ? 'template' : 'pdf_url');

    if (sourceType === 'template' && !ctx.input.templateId) {
      throw pandadocServiceError('templateId is required when sourceType is "template".');
    }

    if (sourceType === 'pdf_url' && !ctx.input.sourceUrl) {
      throw pandadocServiceError('sourceUrl is required when sourceType is "pdf_url".');
    }

    if (ctx.input.templateId && ctx.input.sourceUrl) {
      throw pandadocServiceError('Provide either templateId or sourceUrl, not both.');
    }

    if (ctx.input.ownerEmail && ctx.input.ownerMembershipId) {
      throw pandadocServiceError('Provide either ownerEmail or ownerMembershipId, not both.');
    }

    let recipientWithoutDelivery = ctx.input.recipients.find(
      recipient => !recipient.email && !recipient.phone
    );
    if (recipientWithoutDelivery) {
      throw pandadocServiceError(
        'Each recipient must include at least one of email or phone.'
      );
    }

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
      template_uuid: sourceType === 'template' ? ctx.input.templateId : undefined,
      url: sourceType === 'pdf_url' ? ctx.input.sourceUrl : undefined,
      name: ctx.input.name,
      recipients: ctx.input.recipients.map(r => ({
        email: r.email,
        phone: r.phone,
        first_name: r.firstName,
        last_name: r.lastName,
        company: r.company,
        role: r.role,
        signing_order: r.signingOrder,
        delivery_methods: r.deliveryMethods,
        redirect: r.redirect
      })),
      tokens: ctx.input.tokens?.map(t => ({ name: t.name, value: t.value })),
      fields: fieldsPayload,
      metadata: ctx.input.metadata,
      tags: ctx.input.tags,
      folder_uuid: ctx.input.folderUuid,
      owner:
        ctx.input.ownerEmail || ctx.input.ownerMembershipId
          ? { email: ctx.input.ownerEmail, membership_id: ctx.input.ownerMembershipId }
          : undefined,
      detect_title_variables: ctx.input.detectTitleVariables,
      parse_form_fields: ctx.input.parseFormFields,
      pricing_tables: ctx.input.pricingTables,
      tables: ctx.input.tables,
      texts: ctx.input.texts,
      images: ctx.input.images,
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
