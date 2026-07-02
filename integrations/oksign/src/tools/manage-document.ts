import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkDocument = SlateTool.create(spec, {
  name: 'Check Document',
  key: 'check_document',
  description: `Check if a document exists on the OKSign platform and retrieve its basic info including filename and whether it's a reusable template. Also retrieves the form descriptor if the document has one configured.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID to check')
    })
  )
  .output(
    z.object({
      exists: z.boolean().describe('Whether the document exists'),
      filename: z.string().optional().describe('Document filename'),
      isTemplate: z
        .boolean()
        .optional()
        .describe('Whether the document is a reusable template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    try {
      let info = await client.documentExists(ctx.input.documentId);
      return {
        output: {
          exists: true,
          filename: info.filename,
          isTemplate: info.template
        },
        message: `Document \`${ctx.input.documentId}\` exists: **${info.filename}**${info.template ? ' (template)' : ''}`
      };
    } catch {
      return {
        output: {
          exists: false
        },
        message: `Document \`${ctx.input.documentId}\` does not exist.`
      };
    }
  })
  .build();

export let removeDocument = SlateTool.create(spec, {
  name: 'Remove Document',
  key: 'remove_document',
  description: `Remove a document from the OKSign platform. Documents are automatically removed once all signatures are collected, but this tool allows manual removal. Cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the document was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeDocument(ctx.input.documentId);

    return {
      output: { removed: true },
      message: `Document \`${ctx.input.documentId}\` removed successfully.`
    };
  })
  .build();

export let getFormDescriptor = SlateTool.create(spec, {
  name: 'Get Form Descriptor',
  key: 'get_form_descriptor',
  description: `Retrieve the form descriptor (field configuration) for a document. Returns all configured fields, signer information, and signing options.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID to retrieve the form descriptor for')
    })
  )
  .output(
    z.object({
      formDescriptor: z
        .any()
        .describe(
          'The full form descriptor object including fields, signers, and configuration'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let formDescriptor = await client.retrieveFormDescriptor(ctx.input.documentId);

    return {
      output: { formDescriptor },
      message: `Form descriptor retrieved for document \`${ctx.input.documentId}\`.`
    };
  })
  .build();

export let getLinkedDocuments = SlateTool.create(spec, {
  name: 'Get Linked Documents',
  key: 'get_linked_documents',
  description: `Look up linked source and signed document ID pairs. Given a document ID, returns the mapping between original (source) and signed document IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Source or signed document ID to look up')
    })
  )
  .output(
    z.object({
      linkedDocuments: z.any().describe('Linked source/signed document ID pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let linkedDocuments = await client.retrieveLinkedList(ctx.input.documentId);

    return {
      output: { linkedDocuments },
      message: `Linked documents retrieved for \`${ctx.input.documentId}\`.`
    };
  })
  .build();
