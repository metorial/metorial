import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signingOptionsSchema = z
  .object({
    eid: z.boolean().optional().describe('Enable Belgian eID card signing'),
    pen: z.boolean().optional().describe('Enable pen/scribble on touchscreen signing'),
    tan: z.boolean().optional().describe('Enable SMS/TAN code signing'),
    itsme: z.boolean().optional().describe('Enable itsme Qualified Electronic Signature'),
    smartid: z.boolean().optional().describe('Enable Smart-ID signing')
  })
  .describe('Available signing methods for this field');

let formFieldSchema = z.object({
  signerId: z.string().describe('Signer ID this field belongs to'),
  fieldType: z
    .enum(['CanvasSIG', 'Text', 'TextArea', 'Select', 'Date', 'Checkbox'])
    .describe('Type of form field'),
  name: z.string().describe('Field name (e.g. "SIG_FIELD_1", "email_field")'),
  pageNumber: z.number().optional().describe('Page number where the field is placed'),
  posX: z.number().optional().describe('X coordinate position on the page'),
  posY: z.number().optional().describe('Y coordinate position on the page'),
  width: z
    .number()
    .optional()
    .describe('Field width in pixels (recommended 150 for signatures)'),
  height: z
    .number()
    .optional()
    .describe('Field height in pixels (recommended 50 for signatures, 3:1 ratio)'),
  required: z.boolean().optional().describe('Whether the field is mandatory'),
  signingOptions: signingOptionsSchema.optional(),
  marker: z
    .string()
    .optional()
    .describe('Text marker in the document to position the field instead of coordinates'),
  validationFunction: z
    .string()
    .optional()
    .describe('Validation function name (e.g. "BT_CUSTOMERS.oksign.isValidEmail<blur>()")'),
  prefillValue: z.string().optional().describe('Prefilled value for the field'),
  readOnly: z.boolean().optional().describe('Whether the field is read-only'),
  selectOptions: z.array(z.string()).optional().describe('Options for Select dropdown fields')
});

let signerInfoSchema = z.object({
  signerId: z.string().describe('Unique signer ID'),
  name: z.string().describe('Signer full name'),
  email: z.string().optional().describe('Signer email address'),
  mobile: z
    .string()
    .optional()
    .describe('Signer mobile number in E.164 format (e.g. +32470123456)'),
  actingAs: z
    .string()
    .optional()
    .describe('Capacity in which the signer acts (e.g. "CEO", "Witness")')
});

let workflowStepSchema = z.object({
  signerId: z.string().describe('Signer ID'),
  sequence: z.number().describe('Sequence number (lowest goes first)')
});

export let configureForm = SlateTool.create(spec, {
  name: 'Configure Form',
  key: 'configure_form',
  description: `Define signature and form fields on an uploaded document, configure signers, and receive signing URLs. Supports signature boxes, text fields, text areas, select dropdowns, date fields, and checkboxes. Fields can be positioned using coordinates or text markers embedded in the document. Returns a signing URL for each signer.`,
  instructions: [
    'Use text markers for field positioning when the document layout is dynamic.',
    'For signature fields (CanvasSIG), a 3:1 width-to-height ratio is recommended (e.g. 150x50).',
    'Signer IDs can be calculated using the Calculate Signer ID tool, or set manually following the pattern: bt_00000000-0000-0000-0000-0000000-XXXXXXXXXXXX.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID returned by the upload tool'),
      fields: z.array(formFieldSchema).describe('Form fields to place on the document'),
      signers: z.array(signerInfoSchema).describe('Information about each signer'),
      reusable: z
        .boolean()
        .optional()
        .describe('Whether the document can be signed multiple times (template mode)'),
      logoUrl: z
        .string()
        .optional()
        .describe('URL of a logo to display during the signing process'),
      sendToMeOnly: z
        .boolean()
        .optional()
        .describe('Only send the signed document to the account email'),
      sendToMeEmail: z
        .string()
        .optional()
        .describe('Override email address for signed document delivery'),
      assignTo: z.string().optional().describe('User email to assign the document to'),
      filename: z
        .string()
        .optional()
        .describe('Document filename (useful for non-ASCII names)'),
      workflow: z
        .array(workflowStepSchema)
        .optional()
        .describe('Sequential signing workflow order')
    })
  )
  .output(
    z.object({
      signerUrls: z
        .array(
          z.object({
            name: z.string().describe('Signer name'),
            signerId: z.string().describe('Signer ID'),
            signingUrl: z
              .string()
              .describe('URL for the signer to access and sign the document')
          })
        )
        .describe('Signing URLs for each signer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let fields = ctx.input.fields.map(f => ({
      signerid: f.signerId,
      inputtype: f.fieldType,
      name: f.name,
      pagenbr: f.pageNumber,
      posX: f.posX,
      posY: f.posY,
      width: f.width,
      height: f.height,
      required: f.required,
      signingoptions: f.signingOptions,
      marker: f.marker,
      fnname: f.validationFunction,
      value: f.prefillValue,
      readonly: f.readOnly,
      selectoptions: f.selectOptions
    }));

    let signersinfo = ctx.input.signers.map(s => ({
      id: s.signerId,
      name: s.name,
      email: s.email,
      mobile: s.mobile,
      actingas: s.actingAs
    }));

    let formDescriptor: any = {
      fields,
      signersinfo,
      reusable: ctx.input.reusable,
      logo: ctx.input.logoUrl,
      sendtomeonly: ctx.input.sendToMeOnly,
      sendtomeemail: ctx.input.sendToMeEmail,
      assignto: ctx.input.assignTo,
      filename: ctx.input.filename,
      workflow: ctx.input.workflow
        ? ctx.input.workflow.map(w => ({ id: w.signerId, sequence: w.sequence }))
        : undefined
    };

    let signerUrlResults = await client.uploadFormDescriptor(
      ctx.input.documentId,
      formDescriptor
    );

    let signerUrls = signerUrlResults.map(s => ({
      name: s.name,
      signerId: s.id,
      signingUrl: s.url
    }));

    return {
      output: { signerUrls },
      message:
        `Form configured with **${fields.length}** field(s) for **${signersinfo.length}** signer(s).\n\n` +
        signerUrls.map(s => `- **${s.name}**: [Signing URL](${s.signingUrl})`).join('\n')
    };
  })
  .build();
