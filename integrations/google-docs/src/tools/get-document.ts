import { SlateTool } from 'slates';
import { z } from 'zod';
import { type Document, GoogleDocsClient, type StructuralElement } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';

// Helper to extract plain text from document structure
let extractPlainText = (doc: Document): string => {
  if (!doc.body?.content) return '';

  let text = '';

  let processElements = (elements: StructuralElement[]) => {
    for (let element of elements) {
      if (element.paragraph?.elements) {
        for (let paraElement of element.paragraph.elements) {
          if (paraElement.textRun?.content) {
            text += paraElement.textRun.content;
          }
        }
      } else if (element.table?.tableRows) {
        for (let row of element.table.tableRows) {
          if (row.tableCells) {
            for (let cell of row.tableCells) {
              if (cell.content) {
                processElements(cell.content);
              }
            }
          }
        }
      }
    }
  };

  processElements(doc.body.content);
  return text;
};

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieves a Google Docs document by its ID. Returns the document metadata and optionally the full content as both structured JSON and plain text.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleDocsActionScopes.getDocument)
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve'),
      includeContent: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include the document content in the response')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the document'),
      title: z.string().describe('Title of the document'),
      revisionId: z.string().optional().describe('Current revision ID of the document'),
      plainText: z.string().optional().describe('Plain text content of the document'),
      namedRanges: z
        .array(
          z.object({
            namedRangeId: z.string().optional(),
            name: z.string().optional(),
            startIndex: z.number().optional(),
            endIndex: z.number().optional()
          })
        )
        .optional()
        .describe('Named ranges defined in the document'),
      bodyEndIndex: z
        .number()
        .optional()
        .describe('End index of the document body, useful for appending content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDocsClient({
      token: ctx.auth.token
    });

    let document = await client.getDocument(ctx.input.documentId);

    let plainText: string | undefined;
    let bodyEndIndex: number | undefined;

    if (ctx.input.includeContent) {
      plainText = extractPlainText(document);

      // Find the end index of the body
      if (document.body?.content && document.body.content.length > 0) {
        let lastElement = document.body.content[document.body.content.length - 1];
        if (lastElement) {
          bodyEndIndex = lastElement.endIndex;
        }
      }
    }

    // Extract named ranges
    let namedRanges: Array<{
      namedRangeId?: string;
      name?: string;
      startIndex?: number;
      endIndex?: number;
    }> = [];

    if (document.namedRanges) {
      for (let [name, entry] of Object.entries(document.namedRanges)) {
        let ranges = entry.namedRanges ?? [];

        for (let range of ranges) {
          if (range.ranges && range.ranges.length > 0) {
            for (let r of range.ranges) {
              namedRanges.push({
                namedRangeId: range.namedRangeId,
                name: range.name ?? entry.name ?? name,
                startIndex: r.startIndex,
                endIndex: r.endIndex
              });
            }
            continue;
          }

          if (range.namedRangeId || range.name || name) {
            namedRanges.push({
              namedRangeId: range.namedRangeId,
              name: range.name ?? entry.name ?? name
            });
          }
        }
      }
    }

    return {
      output: {
        documentId: document.documentId,
        title: document.title,
        revisionId: document.revisionId,
        plainText,
        namedRanges: namedRanges.length > 0 ? namedRanges : undefined,
        bodyEndIndex
      },
      message: `Retrieved document **"${document.title}"**${plainText ? ` (${plainText.length} characters)` : ''}`
    };
  })
  .build();
