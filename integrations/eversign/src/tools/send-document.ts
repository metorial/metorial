import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let signerSchema = z.object({
  name: z.string().describe('Full name of the signer'),
  email: z.string().describe('Email address of the signer'),
  order: z
    .number()
    .optional()
    .describe('Signing order (starts at 1). Required when useSignerOrder is enabled.'),
  pin: z.string().optional().describe('A secret PIN the signer must enter before signing'),
  message: z.string().optional().describe('Custom message for this specific signer'),
  deliverEmail: z
    .boolean()
    .optional()
    .describe(
      'Set to false to prevent email delivery to this signer (e.g. for embedded signing)'
    ),
  language: z
    .string()
    .optional()
    .describe('Two-letter language code for signer communication (e.g. en, de, fr, es)')
});

let recipientSchema = z.object({
  name: z.string().describe('Full name of the CC recipient'),
  email: z.string().describe('Email address of the CC recipient'),
  language: z
    .string()
    .optional()
    .describe('Two-letter language code for recipient communication')
});

let fileSchema = z.object({
  name: z.string().describe('Display name for the file'),
  fileUrl: z.string().optional().describe('URL to download the file from'),
  fileId: z.string().optional().describe('Existing file ID from a previous upload'),
  fileBase64: z.string().optional().describe('Base64-encoded file content')
});

let fieldSchema = z.object({
  type: z
    .enum([
      'signature',
      'initials',
      'date_signed',
      'note',
      'text',
      'checkbox',
      'radio',
      'dropdown',
      'attachment'
    ])
    .describe('Field type'),
  x: z.number().describe('Horizontal pixel offset from document left'),
  y: z.number().describe('Vertical pixel offset from document top'),
  width: z.number().describe('Field width in pixels'),
  height: z.number().describe('Field height in pixels'),
  page: z.number().describe('Page number the field should appear on'),
  signer: z.number().describe('Signer ID this field is assigned to'),
  identifier: z.string().optional().describe('Unique field identifier'),
  required: z.boolean().optional().describe('Whether the field is required'),
  readonly: z.boolean().optional().describe('Whether the field is read-only'),
  name: z.string().optional().describe('Field label'),
  value: z.string().optional().describe('Pre-filled value'),
  validationType: z
    .enum(['email_address', 'letters_only', 'numbers_only'])
    .optional()
    .describe('Validation rule'),
  textSize: z.number().optional().describe('Font size'),
  textColor: z.string().optional().describe('Hex color code for text'),
  textFont: z
    .string()
    .optional()
    .describe(
      'Font family (arial, calibri, courier_new, helvetica, georgia, times_new_roman)'
    ),
  textStyle: z.string().optional().describe('Text style (combinations of B, U, I)'),
  options: z.array(z.string()).optional().describe('Options for dropdown fields'),
  group: z.string().optional().describe('Group identifier for radio buttons')
});

export let sendDocument = SlateTool.create(spec, {
  name: 'Send Document',
  key: 'send_document',
  description: `Create and send a document for electronic signature. Supports uploading files via URL, file ID, or base64, adding multiple signers with configurable signing order, placing signature fields on specific pages, and adding CC recipients. Optionally enable embedded signing to get signing URLs for each signer.`,
  instructions: [
    'At least one file and one signer must be provided.',
    'Files can be specified by URL, a previously uploaded file ID, or base64 content.',
    'If no fields are specified, Eversign will automatically add a signature page.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Document title'),
      message: z.string().optional().describe('Message for all signers'),
      files: z.array(fileSchema).min(1).describe('Files to include in the document'),
      signers: z.array(signerSchema).min(1).describe('Signers for the document'),
      recipients: z
        .array(recipientSchema)
        .optional()
        .describe('CC recipients who receive a copy'),
      fields: z
        .array(z.array(fieldSchema))
        .optional()
        .describe('2D array of fields grouped per field set'),
      useSignerOrder: z.boolean().optional().describe('Enable sequential signing order'),
      reminders: z.boolean().optional().describe('Enable automatic signing reminders'),
      requireAllSigners: z.boolean().optional().describe('Require all signers to sign'),
      embeddedSigningEnabled: z
        .boolean()
        .optional()
        .describe('Enable embedded signing to receive signing URLs'),
      flexibleSigning: z
        .boolean()
        .optional()
        .describe('Allow signers to place their own signature fields'),
      redirect: z.string().optional().describe('URL to redirect signers to after signing'),
      redirectDecline: z
        .string()
        .optional()
        .describe('URL to redirect signers to after declining'),
      expires: z.string().optional().describe('Expiration date as a Unix timestamp string'),
      isDraft: z.boolean().optional().describe('Create as draft without sending'),
      customRequesterName: z.string().optional().describe('Custom requester display name'),
      customRequesterEmail: z.string().optional().describe('Custom requester email address'),
      meta: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs')
    })
  )
  .output(
    z.object({
      documentHash: z.string().describe('Unique document identifier'),
      title: z.string().optional().describe('Document title'),
      isDraft: z.boolean().describe('Whether the document is a draft'),
      isCompleted: z.boolean().describe('Whether the document is completed'),
      embeddedSigningEnabled: z.boolean().describe('Whether embedded signing is enabled'),
      signers: z
        .array(
          z.object({
            signerId: z.number().describe('Signer ID'),
            name: z.string().describe('Signer name'),
            email: z.string().describe('Signer email'),
            signed: z.boolean().describe('Whether the signer has signed'),
            embeddedSigningUrl: z
              .string()
              .optional()
              .describe('Embedded signing URL if enabled')
          })
        )
        .describe('List of signers with their status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let body: Record<string, any> = {};

    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.message) body.message = ctx.input.message;
    if (ctx.input.isDraft) body.is_draft = 1;
    if (ctx.input.useSignerOrder) body.use_signer_order = 1;
    if (ctx.input.reminders) body.reminders = 1;
    if (ctx.input.requireAllSigners) body.require_all_signers = 1;
    if (ctx.input.embeddedSigningEnabled) body.embedded_signing_enabled = 1;
    if (ctx.input.flexibleSigning) body.flexible_signing = 1;
    if (ctx.input.redirect) body.redirect = ctx.input.redirect;
    if (ctx.input.redirectDecline) body.redirect_decline = ctx.input.redirectDecline;
    if (ctx.input.expires) body.expires = ctx.input.expires;
    if (ctx.input.customRequesterName)
      body.custom_requester_name = ctx.input.customRequesterName;
    if (ctx.input.customRequesterEmail)
      body.custom_requester_email = ctx.input.customRequesterEmail;
    if (ctx.input.meta) body.meta = ctx.input.meta;

    body.files = ctx.input.files.map(f => {
      let file: Record<string, string> = { name: f.name };
      if (f.fileUrl) file.file_url = f.fileUrl;
      if (f.fileId) file.file_id = f.fileId;
      if (f.fileBase64) file.file_base64 = f.fileBase64;
      return file;
    });

    body.signers = ctx.input.signers.map((s, i) => {
      let signer: Record<string, any> = {
        id: i + 1,
        name: s.name,
        email: s.email
      };
      if (s.order !== undefined) signer.order = s.order;
      if (s.pin) signer.pin = s.pin;
      if (s.message) signer.message = s.message;
      if (s.deliverEmail !== undefined) signer.deliver_email = s.deliverEmail ? 1 : 0;
      if (s.language) signer.language = s.language;
      return signer;
    });

    if (ctx.input.recipients) {
      body.recipients = ctx.input.recipients.map(r => {
        let recipient: Record<string, any> = { name: r.name, email: r.email };
        if (r.language) recipient.language = r.language;
        return recipient;
      });
    }

    if (ctx.input.fields) {
      body.fields = ctx.input.fields.map(fieldGroup =>
        fieldGroup.map(f => {
          let field: Record<string, any> = {
            type: f.type,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            page: f.page,
            signer: f.signer
          };
          if (f.identifier) field.identifier = f.identifier;
          if (f.required !== undefined) field.required = f.required ? 1 : 0;
          if (f.readonly !== undefined) field.readonly = f.readonly ? 1 : 0;
          if (f.name) field.name = f.name;
          if (f.value) field.value = f.value;
          if (f.validationType) field.validation_type = f.validationType;
          if (f.textSize) field.text_size = f.textSize;
          if (f.textColor) field.text_color = f.textColor;
          if (f.textFont) field.text_font = f.textFont;
          if (f.textStyle) field.text_style = f.textStyle;
          if (f.options) field.options = f.options;
          if (f.group) field.group = f.group;
          return field;
        })
      );
    }

    let doc = await client.createDocument(body);

    let signers = (doc.signers || []).map((s: any) => ({
      signerId: s.id,
      name: s.name,
      email: s.email,
      signed: s.signed === 1 || s.signed === true,
      embeddedSigningUrl: s.embedded_signing_url || undefined
    }));

    return {
      output: {
        documentHash: doc.document_hash,
        title: doc.title || undefined,
        isDraft: doc.is_draft === 1 || doc.is_draft === true,
        isCompleted: doc.is_completed === 1 || doc.is_completed === true,
        embeddedSigningEnabled:
          doc.embedded_signing_enabled === 1 || doc.embedded_signing_enabled === true,
        signers
      },
      message: `Document "${doc.title || doc.document_hash}" created and sent to ${signers.length} signer(s).`
    };
  })
  .build();
