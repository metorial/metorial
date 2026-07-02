import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let redactResume = SlateTool.create(spec, {
  name: 'Redact Resume',
  key: 'redact_resume',
  description: `Generate a redacted version of a parsed resume document. Select which categories of personally identifiable information (PII) to redact, including personal details (name, address, phone, email), work details (company names), education details (university names), headshots, referees, locations, dates, gender, and PDF metadata.

Returns a base64-encoded PDF with the selected fields redacted. The original document is not modified.`,
  instructions: [
    'The document must already be uploaded and parsed in Affinda before redaction.',
    'All redaction options default to true if not specified — set specific options to false to preserve those fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentIdentifier: z
        .string()
        .describe('Identifier of the parsed resume document to redact.'),
      redactHeadshot: z
        .boolean()
        .optional()
        .describe('Redact the candidate headshot photo. Defaults to true.'),
      redactPersonalDetails: z
        .boolean()
        .optional()
        .describe('Redact personal details (name, address, phone, email). Defaults to true.'),
      redactWorkDetails: z
        .boolean()
        .optional()
        .describe('Redact work details such as company names. Defaults to true.'),
      redactEducationDetails: z
        .boolean()
        .optional()
        .describe('Redact education details such as university names. Defaults to true.'),
      redactReferees: z
        .boolean()
        .optional()
        .describe('Redact referee information. Defaults to true.'),
      redactLocations: z
        .boolean()
        .optional()
        .describe('Redact location names. Defaults to true.'),
      redactDates: z.boolean().optional().describe('Redact dates. Defaults to true.'),
      redactGender: z
        .boolean()
        .optional()
        .describe('Redact gender information. Defaults to true.'),
      redactPdfMetadata: z
        .boolean()
        .optional()
        .describe('Redact PDF metadata. Defaults to true.')
    })
  )
  .output(
    z.object({
      redactedPdfBase64: z
        .string()
        .describe('Base64-encoded content of the redacted PDF file.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info('Generating redacted document...');

    let base64Pdf = await client.getRedactedDocument(ctx.input.documentIdentifier, {
      redactHeadshot: ctx.input.redactHeadshot,
      redactPersonalDetails: ctx.input.redactPersonalDetails,
      redactWorkDetails: ctx.input.redactWorkDetails,
      redactEducationDetails: ctx.input.redactEducationDetails,
      redactReferees: ctx.input.redactReferees,
      redactLocations: ctx.input.redactLocations,
      redactDates: ctx.input.redactDates,
      redactGender: ctx.input.redactGender,
      redactPdfMetadata: ctx.input.redactPdfMetadata
    });

    return {
      output: {
        redactedPdfBase64: base64Pdf
      },
      message: `Redacted PDF generated for document \`${ctx.input.documentIdentifier}\`.`
    };
  })
  .build();
