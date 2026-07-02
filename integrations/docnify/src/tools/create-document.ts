import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document From Template',
  key: 'create_document_from_template',
  description: `Creates a new Docnify document from a pre-existing template. Templates define reusable document structures that can be populated and sent to recipients for signing. This is the primary method for programmatically generating documents in Docnify.`,
  instructions: [
    'Provide the template ID of an existing Docnify template to create a document from it.',
    'Optionally specify a custom name for the new document.'
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
        .describe('ID of the Docnify template to create the document from'),
      documentName: z.string().optional().describe('Custom name for the new document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the newly created document'),
      documentName: z.string().describe('Name of the created document'),
      status: z.string().describe('Current status of the document'),
      templateId: z.string().optional().describe('ID of the template used'),
      createdAt: z.string().describe('Timestamp when the document was created'),
      updatedAt: z.string().describe('Timestamp when the document was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let document = await client.createDocumentFromTemplate({
      templateId: ctx.input.templateId,
      name: ctx.input.documentName
    });

    return {
      output: {
        documentId: document.id,
        documentName: document.name,
        status: document.status,
        templateId: document.templateId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      },
      message: `Created document **${document.name}** (ID: ${document.id}) from template ${ctx.input.templateId}. Status: ${document.status}.`
    };
  })
  .build();
