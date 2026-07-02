import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocumentMetadata = SlateTool.create(spec, {
  name: 'Get Document Metadata',
  key: 'get_document_metadata',
  description: `Retrieve detailed metadata from a signed document, including signature details (who signed, when, authentication method), form field values, and document status. Uses the v2 metadata endpoint for enhanced field information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      signedDocumentId: z
        .string()
        .describe('The signed document ID (not the source document ID)')
    })
  )
  .output(
    z.object({
      filename: z.string().describe('Document filename'),
      fileSize: z.number().describe('Document file size in bytes'),
      signaturesRequired: z
        .number()
        .describe('Total number of signature fields in the document'),
      signaturesCompleted: z.number().describe('Number of completed signatures'),
      isFullySigned: z.boolean().describe('Whether all signatures have been collected'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            value: z.string().describe('Field value'),
            fieldType: z.string().describe('Field type (CanvasSIG, Text, etc.)'),
            signerId: z.string().describe('Signer ID the field belongs to')
          })
        )
        .describe('Completed form fields with their values'),
      signatures: z
        .array(
          z.object({
            signedBy: z.string().describe('Name of the person who signed'),
            actingAs: z.string().describe('Capacity in which they signed'),
            authMethod: z
              .string()
              .describe('Authentication method used (Pen, TAN, eID, Itsme, Smart-ID)'),
            signedAt: z.string().describe('ISO timestamp of when the signature was placed'),
            serialNumber: z
              .string()
              .describe('Certificate serial number (for X.509 signatures)'),
            provider: z.string().describe('Signature provider'),
            signerId: z.string().describe('Signer ID')
          })
        )
        .describe('Signature details for each signer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let metadata = await client.retrieveMetadata(ctx.input.signedDocumentId);

    let isFullySigned = metadata.nbrOfSigaturesValid >= metadata.nbrOfSigaturesRequired;

    let fields = (metadata.fields || []).map(f => ({
      name: f.name,
      value: f.value,
      fieldType: f.inputtype,
      signerId: f.signerid
    }));

    let signatures = (metadata.signersinfo || []).map(s => ({
      signedBy: s.signedby,
      actingAs: s.actingas,
      authMethod: s.authMethod,
      signedAt: s.isodate,
      serialNumber: s.serialnumber,
      provider: s.provider,
      signerId: s.signerid
    }));

    return {
      output: {
        filename: metadata.filename,
        fileSize: metadata.size,
        signaturesRequired: metadata.nbrOfSigaturesRequired,
        signaturesCompleted: metadata.nbrOfSigaturesValid,
        isFullySigned,
        fields,
        signatures
      },
      message: `Document **${metadata.filename}** — ${metadata.nbrOfSigaturesValid}/${metadata.nbrOfSigaturesRequired} signatures completed${isFullySigned ? ' ✓ Fully signed' : ''}.`
    };
  })
  .build();
