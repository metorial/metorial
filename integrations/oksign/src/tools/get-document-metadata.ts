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
      fileSize: z
        .number()
        .optional()
        .describe('Exact document size in bytes when returned numerically by the provider'),
      fileSizeDisplay: z
        .string()
        .optional()
        .describe('Provider formatted file size, for example 80 kB'),
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

    let fields = (metadata.fields || []).map(f => {
      let value = f.metadata?.value ?? f.value;
      return {
        name: f.name,
        value: typeof value === 'string' ? value : value ? JSON.stringify(value) : '',
        fieldType: f.inputtype,
        signerId:
          typeof value === 'object' ? (value.signerid ?? f.signerid ?? '') : (f.signerid ?? '')
      };
    });

    let signatures = (metadata.fields || []).flatMap(field => {
      let value = field.metadata?.value;
      if (field.inputtype !== 'CanvasSIG' || typeof value !== 'object' || !value) return [];
      return [
        {
          signedBy: value.signedby ?? '',
          actingAs: value.actingas ?? '',
          authMethod: value.authMethod ?? '',
          signedAt: value.isodate ?? '',
          serialNumber: value.serialnumber ?? '',
          provider: value.provider ?? '',
          signerId: value.signerid ?? field.signerid ?? ''
        }
      ];
    });

    return {
      output: {
        filename: metadata.filename,
        fileSize: typeof metadata.size === 'number' ? metadata.size : undefined,
        fileSizeDisplay: typeof metadata.size === 'string' ? metadata.size : undefined,
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
