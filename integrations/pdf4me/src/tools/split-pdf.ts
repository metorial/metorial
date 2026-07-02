import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdf4meServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  attachmentMetadataSchema,
  streamDocumentAttachment,
  streamDocumentOutput
} from './shared';

export let splitPdf = SlateTool.create(spec, {
  name: 'Split PDF',
  key: 'split_pdf',
  description: `Split a PDF document into multiple files. Supports splitting by page number, recurring intervals, page ranges, text content, or barcodes.
Returns an array of split document files.`,
  instructions: [
    'For "splitAfterPage", provide the page number to split after in splitPageNumber.',
    'For "recurringSplit", provide the interval in splitPageNumber (e.g. 5 to split every 5 pages).',
    'For "splitSequence", provide an array of page numbers in splitPages.',
    'For "splitRanges", provide ranges like "1-3,4-6" in splitRangeText.',
    'For "byText", provide the search text and split type.',
    'For "byBarcode", provide barcode filter, data, and type.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      splitMethod: z
        .enum([
          'splitAfterPage',
          'recurringSplit',
          'splitSequence',
          'splitRanges',
          'byText',
          'byBarcode'
        ])
        .describe('Method to use for splitting the PDF'),
      splitPageNumber: z
        .number()
        .optional()
        .describe('Page number for "splitAfterPage" or interval for "recurringSplit"'),
      splitPages: z
        .array(z.number())
        .optional()
        .describe('Array of page numbers for "splitSequence"'),
      splitRangeText: z
        .string()
        .optional()
        .describe('Page ranges for "splitRanges" (e.g. "1-3,4-6")'),
      searchText: z.string().optional().describe('Text to search for when splitting by text'),
      textSplitType: z
        .enum(['textIsOnFirstPage', 'textIsOnLastPage'])
        .optional()
        .describe('How to handle the page with the matching text'),
      barcodeFilter: z
        .string()
        .optional()
        .describe(
          'Barcode filter for "byBarcode" split (e.g. "startsWith", "endsWith", "contains", "equals")'
        ),
      barcodeSearchText: z
        .string()
        .optional()
        .describe('Barcode data to match for "byBarcode" split'),
      barcodeType: z
        .string()
        .optional()
        .describe('Barcode type for "byBarcode" split (e.g. "qrCode", "code128")'),
      barcodeSplitPage: z
        .enum(['barcodeIsOnFirstPage', 'barcodeIsOnLastPage'])
        .optional()
        .describe('How to handle the barcode page in "byBarcode" split'),
      fileNaming: z.string().optional().describe('Custom naming pattern for split files')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            ...attachmentMetadataSchema.shape,
            barcodeText: z
              .string()
              .optional()
              .describe('Barcode text found (for barcode split)'),
            extractedText: z.string().optional().describe('Text found (for text split)')
          })
        )
        .describe('Array of split documents'),
      documentCount: z.number().describe('Number of resulting documents'),
      attachmentCount: z.number().describe('Number of split document attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.splitMethod === 'byText') {
      if (!ctx.input.searchText || !ctx.input.textSplitType) {
        throw pdf4meServiceError(
          'searchText and textSplitType are required for text-based splitting'
        );
      }
      let result = await client.splitByText({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        text: ctx.input.searchText,
        splitTextPage: ctx.input.textSplitType,
        fileNaming: ctx.input.fileNaming
      });
      let splitDocuments = result.splitedDocuments ?? [];
      let documents = splitDocuments.map((doc, index) => ({
        ...streamDocumentOutput(doc, index),
        extractedText: doc.docText
      }));
      let attachments = splitDocuments.map(streamDocumentAttachment);
      return {
        output: {
          documents,
          documentCount: documents.length,
          attachmentCount: attachments.length
        },
        attachments,
        message: `Split PDF into **${documents.length}** documents by text "${ctx.input.searchText}"`
      };
    }

    if (ctx.input.splitMethod === 'byBarcode') {
      if (
        !ctx.input.barcodeFilter ||
        !ctx.input.barcodeSearchText ||
        !ctx.input.barcodeType ||
        !ctx.input.barcodeSplitPage
      ) {
        throw pdf4meServiceError(
          'barcodeFilter, barcodeSearchText, barcodeType, and barcodeSplitPage are required for barcode-based splitting'
        );
      }
      let result = await client.splitByBarcode({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        barcodeFilter: ctx.input.barcodeFilter,
        barcodeString: ctx.input.barcodeSearchText,
        barcodeType: ctx.input.barcodeType,
        splitBarcodePage: ctx.input.barcodeSplitPage
      });
      let splitDocuments = result.splitedDocuments ?? [];
      let documents = splitDocuments.map((doc, index) => ({
        ...streamDocumentOutput(doc, index),
        barcodeText: doc.barcodeText
      }));
      let attachments = splitDocuments.map(streamDocumentAttachment);
      return {
        output: {
          documents,
          documentCount: documents.length,
          attachmentCount: attachments.length
        },
        attachments,
        message: `Split PDF into **${documents.length}** documents by barcode`
      };
    }

    let splitAction: string;
    if (ctx.input.splitMethod === 'splitAfterPage') {
      splitAction = 'SplitAfterPage';
    } else if (ctx.input.splitMethod === 'recurringSplit') {
      splitAction = 'RecurringSplitAfterPage';
    } else if (ctx.input.splitMethod === 'splitSequence') {
      splitAction = 'SplitSequence';
    } else {
      splitAction = 'SplitRanges';
    }

    let result = await client.splitPdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      splitAction,
      splitActionNumber: ctx.input.splitPageNumber,
      splitSequence: ctx.input.splitPages,
      splitRanges: ctx.input.splitRangeText,
      fileNaming: ctx.input.fileNaming
    });

    let splitDocuments = result.splitedDocuments ?? [];
    let documents = splitDocuments.map(streamDocumentOutput);
    let attachments = splitDocuments.map(streamDocumentAttachment);

    return {
      output: {
        documents,
        documentCount: documents.length,
        attachmentCount: attachments.length
      },
      attachments,
      message: `Split PDF into **${documents.length}** documents using ${ctx.input.splitMethod}`
    };
  })
  .build();
