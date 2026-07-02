import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z.object({
  filename: z.string().describe('Filename with extension'),
  contentBase64: z.string().describe('Base64-encoded file bytes'),
  contentType: z
    .string()
    .optional()
    .describe('MIME type. Defaults to application/octet-stream.')
});

export let createCase = SlateTool.create(spec, {
  name: 'Create Case',
  key: 'create_case',
  description: `Create a Docsumo case for a case type, or add documents to an existing case. Supports case metadata, initial case fields, assignment, stage selection, workflow triggering, and optional base64 file uploads.`,
  instructions: [
    'Use List Agents to find the casetypeId and Get Case Type Details to find stage and case field IDs.',
    'If files are provided, doctype must be configured on the case type.',
    'The workflow runs by default in Docsumo unless triggerWorkflow is set to false.'
  ],
  constraints: [
    'Supported file extensions: jpg, jpeg, png, tiff, pdf, xlsx.',
    'Docsumo documents upload asynchronously after the case is created.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      casetypeId: z.string().describe('Case type ID. Get this from the List Agents tool.'),
      caseId: z
        .string()
        .optional()
        .describe('Existing case ID. If omitted, Docsumo creates a new case.'),
      userCaseId: z.string().optional().describe('External reference ID for the case'),
      caseName: z.string().optional().describe('Display name for the case'),
      stageId: z
        .string()
        .optional()
        .describe('Initial stage ID. Get stage IDs from Get Case Type Details.'),
      assignedTo: z.string().optional().describe('User ID to assign the case to'),
      doctype: z
        .string()
        .optional()
        .describe('Document type for uploaded files, if files are provided'),
      triggerWorkflow: z
        .boolean()
        .optional()
        .describe('Whether to trigger the case workflow after creation/upload'),
      userCaseMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata for the case'),
      caseFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Initial case field values keyed by case field ID'),
      files: z
        .array(fileSchema)
        .optional()
        .describe('Optional base64-encoded files to upload to the case')
    })
  )
  .output(
    z.object({
      caseMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Created or updated case metadata'),
      documentsMetadata: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Uploaded document metadata returned by Docsumo'),
      rawData: z.record(z.string(), z.any()).describe('Full Docsumo response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createCase({
      casetypeId: ctx.input.casetypeId,
      caseId: ctx.input.caseId,
      userCaseId: ctx.input.userCaseId,
      caseName: ctx.input.caseName,
      stageId: ctx.input.stageId,
      assignedTo: ctx.input.assignedTo,
      doctype: ctx.input.doctype,
      triggerWorkflow: ctx.input.triggerWorkflow,
      userCaseMetadata: ctx.input.userCaseMetadata,
      caseFields: ctx.input.caseFields,
      files: ctx.input.files
    });

    let caseMetadata = result.case_metadata;
    let documentsMetadata = result.documents_metadata;
    let caseId = caseMetadata?.case_id || ctx.input.caseId || 'unknown';

    return {
      output: {
        caseMetadata,
        documentsMetadata,
        rawData: result
      },
      message: `Created or updated Docsumo case **${caseId}**.`
    };
  })
  .build();
