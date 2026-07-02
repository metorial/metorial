import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient, type Request } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';

let textStyleSchema = z
  .object({
    bold: z.boolean().optional().describe('Apply bold formatting'),
    italic: z.boolean().optional().describe('Apply italic formatting'),
    underline: z.boolean().optional().describe('Apply underline formatting'),
    strikethrough: z.boolean().optional().describe('Apply strikethrough formatting'),
    fontSize: z.number().optional().describe('Font size in points'),
    fontFamily: z.string().optional().describe('Font family name'),
    foregroundColor: z
      .object({
        red: z.number().min(0).max(1).optional(),
        green: z.number().min(0).max(1).optional(),
        blue: z.number().min(0).max(1).optional()
      })
      .optional()
      .describe('Text color as RGB values (0-1)'),
    backgroundColor: z
      .object({
        red: z.number().min(0).max(1).optional(),
        green: z.number().min(0).max(1).optional(),
        blue: z.number().min(0).max(1).optional()
      })
      .optional()
      .describe('Background highlight color as RGB values (0-1)'),
    link: z.string().optional().describe('URL to link the text to')
  })
  .describe('Text formatting options');

let operationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('insertText'),
    text: z.string().describe('Text to insert'),
    index: z
      .number()
      .optional()
      .describe('Position to insert at (1-based). If not provided, appends to end of document')
  }),
  z.object({
    type: z.literal('deleteText'),
    startIndex: z.number().describe('Start position of text to delete (1-based)'),
    endIndex: z.number().describe('End position of text to delete (1-based, exclusive)')
  }),
  z.object({
    type: z.literal('replaceAllText'),
    searchText: z.string().describe('Text to search for'),
    replaceText: z.string().describe('Text to replace with'),
    matchCase: z.boolean().optional().default(false).describe('Whether to match case')
  }),
  z.object({
    type: z.literal('formatText'),
    startIndex: z.number().describe('Start position of text to format (1-based)'),
    endIndex: z.number().describe('End position of text to format (1-based, exclusive)'),
    style: textStyleSchema
  }),
  z.object({
    type: z.literal('insertImage'),
    imageUri: z.string().url().describe('URL of the image to insert'),
    index: z
      .number()
      .optional()
      .describe('Position to insert at (1-based). If not provided, appends to end'),
    width: z.number().optional().describe('Image width in points'),
    height: z.number().optional().describe('Image height in points')
  }),
  z.object({
    type: z.literal('insertTable'),
    rows: z.number().min(1).describe('Number of rows'),
    columns: z.number().min(1).describe('Number of columns'),
    index: z
      .number()
      .optional()
      .describe('Position to insert at (1-based). If not provided, appends to end')
  }),
  z.object({
    type: z.literal('insertPageBreak'),
    index: z
      .number()
      .optional()
      .describe('Position to insert at (1-based). If not provided, appends to end')
  }),
  z.object({
    type: z.literal('createBulletList'),
    startIndex: z.number().describe('Start position of paragraphs to convert (1-based)'),
    endIndex: z
      .number()
      .describe('End position of paragraphs to convert (1-based, exclusive)'),
    bulletPreset: z
      .enum([
        'BULLET_DISC_CIRCLE_SQUARE',
        'BULLET_DIAMONDX_ARROW3D_SQUARE',
        'BULLET_CHECKBOX',
        'BULLET_ARROW_DIAMOND_DISC',
        'BULLET_STAR_CIRCLE_SQUARE',
        'BULLET_ARROW3D_CIRCLE_SQUARE',
        'BULLET_LEFTTRIANGLE_DIAMOND_DISC',
        'NUMBERED_DECIMAL_ALPHA_ROMAN',
        'NUMBERED_DECIMAL_ALPHA_ROMAN_PARENS',
        'NUMBERED_DECIMAL_NESTED',
        'NUMBERED_UPPERALPHA_ALPHA_ROMAN',
        'NUMBERED_UPPERROMAN_UPPERALPHA_DECIMAL',
        'NUMBERED_ZERODECIMAL_ALPHA_ROMAN'
      ])
      .optional()
      .default('BULLET_DISC_CIRCLE_SQUARE')
      .describe('Style of bullets or numbering')
  }),
  z.object({
    type: z.literal('removeBulletList'),
    startIndex: z.number().describe('Start position of paragraphs (1-based)'),
    endIndex: z.number().describe('End position of paragraphs (1-based, exclusive)')
  })
]);

export let editDocument = SlateTool.create(spec, {
  name: 'Edit Document',
  key: 'edit_document',
  description: `Performs one or more editing operations on a Google Docs document. Supports inserting, deleting, and replacing text, formatting, inserting images, tables, page breaks, and creating bullet lists. Operations are executed in order.`,
  instructions: [
    'When inserting text at a specific position, use the index from getDocument to determine positions',
    'The document body starts at index 1',
    'When multiple operations affect the same positions, execute them from end to start to avoid index shifts',
    'Images must be accessible via HTTPS URL'
  ],
  constraints: [
    'Maximum document size is 25MB',
    'Images must be publicly accessible or accessible to the authenticated user'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleDocsActionScopes.editDocument)
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to edit'),
      operations: z
        .array(operationSchema)
        .min(1)
        .describe('List of operations to perform, executed in order')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the edited document'),
      operationsExecuted: z.number().describe('Number of operations successfully executed'),
      revisionId: z.string().optional().describe('New revision ID after edits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDocsClient({
      token: ctx.auth.token
    });

    let requests: Request[] = [];

    for (let op of ctx.input.operations) {
      switch (op.type) {
        case 'insertText':
          if (op.index !== undefined) {
            requests.push({
              insertText: {
                text: op.text,
                location: { index: op.index }
              }
            });
          } else {
            requests.push({
              insertText: {
                text: op.text,
                endOfSegmentLocation: {}
              }
            });
          }
          break;

        case 'deleteText':
          requests.push({
            deleteContentRange: {
              range: {
                startIndex: op.startIndex,
                endIndex: op.endIndex
              }
            }
          });
          break;

        case 'replaceAllText':
          requests.push({
            replaceAllText: {
              replaceText: op.replaceText,
              containsText: {
                text: op.searchText,
                matchCase: op.matchCase ?? false
              }
            }
          });
          break;

        case 'formatText': {
          let textStyle: Record<string, unknown> = {};
          let fields: string[] = [];

          if (op.style.bold !== undefined) {
            textStyle.bold = op.style.bold;
            fields.push('bold');
          }
          if (op.style.italic !== undefined) {
            textStyle.italic = op.style.italic;
            fields.push('italic');
          }
          if (op.style.underline !== undefined) {
            textStyle.underline = op.style.underline;
            fields.push('underline');
          }
          if (op.style.strikethrough !== undefined) {
            textStyle.strikethrough = op.style.strikethrough;
            fields.push('strikethrough');
          }
          if (op.style.fontSize !== undefined) {
            textStyle.fontSize = { magnitude: op.style.fontSize, unit: 'PT' };
            fields.push('fontSize');
          }
          if (op.style.fontFamily !== undefined) {
            textStyle.weightedFontFamily = { fontFamily: op.style.fontFamily };
            fields.push('weightedFontFamily');
          }
          if (op.style.foregroundColor) {
            textStyle.foregroundColor = {
              color: { rgbColor: op.style.foregroundColor }
            };
            fields.push('foregroundColor');
          }
          if (op.style.backgroundColor) {
            textStyle.backgroundColor = {
              color: { rgbColor: op.style.backgroundColor }
            };
            fields.push('backgroundColor');
          }
          if (op.style.link) {
            textStyle.link = { url: op.style.link };
            fields.push('link');
          }

          requests.push({
            updateTextStyle: {
              range: {
                startIndex: op.startIndex,
                endIndex: op.endIndex
              },
              textStyle: textStyle as any,
              fields: fields.join(',')
            }
          });
          break;
        }

        case 'insertImage':
          if (op.index !== undefined) {
            requests.push({
              insertInlineImage: {
                uri: op.imageUri,
                location: { index: op.index },
                objectSize:
                  op.width && op.height
                    ? {
                        width: { magnitude: op.width, unit: 'PT' },
                        height: { magnitude: op.height, unit: 'PT' }
                      }
                    : undefined
              }
            });
          } else {
            requests.push({
              insertInlineImage: {
                uri: op.imageUri,
                endOfSegmentLocation: {},
                objectSize:
                  op.width && op.height
                    ? {
                        width: { magnitude: op.width, unit: 'PT' },
                        height: { magnitude: op.height, unit: 'PT' }
                      }
                    : undefined
              }
            });
          }
          break;

        case 'insertTable':
          if (op.index !== undefined) {
            requests.push({
              insertTable: {
                rows: op.rows,
                columns: op.columns,
                location: { index: op.index }
              }
            });
          } else {
            requests.push({
              insertTable: {
                rows: op.rows,
                columns: op.columns,
                endOfSegmentLocation: {}
              }
            });
          }
          break;

        case 'insertPageBreak':
          if (op.index !== undefined) {
            requests.push({
              insertPageBreak: {
                location: { index: op.index }
              }
            });
          } else {
            requests.push({
              insertPageBreak: {
                endOfSegmentLocation: {}
              }
            });
          }
          break;

        case 'createBulletList':
          requests.push({
            createParagraphBullets: {
              range: {
                startIndex: op.startIndex,
                endIndex: op.endIndex
              },
              bulletPreset: op.bulletPreset
            }
          });
          break;

        case 'removeBulletList':
          requests.push({
            deleteParagraphBullets: {
              range: {
                startIndex: op.startIndex,
                endIndex: op.endIndex
              }
            }
          });
          break;
      }
    }

    let response = await client.batchUpdate(ctx.input.documentId, requests);

    return {
      output: {
        documentId: response.documentId,
        operationsExecuted: requests.length,
        revisionId: response.writeControl?.targetRevisionId
      },
      message: `Executed **${requests.length} operation(s)** on document \`${response.documentId}\``
    };
  })
  .build();
