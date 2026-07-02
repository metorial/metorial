import { beforeEach, describe, expect, it, vi } from 'vitest';

let docsClientMocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  getDocument: vi.fn(),
  batchUpdate: vi.fn(),
  listDriveFiles: vi.fn(),
  getStartPageToken: vi.fn(),
  listChanges: vi.fn(),
  tokens: [] as string[]
}));

vi.mock('./lib/client', () => ({
  GoogleDocsClient: class {
    constructor(config: { token: string }) {
      docsClientMocks.tokens.push(config.token);
    }

    createDocument(...args: unknown[]) {
      return docsClientMocks.createDocument(...args);
    }

    getDocument(...args: unknown[]) {
      return docsClientMocks.getDocument(...args);
    }

    batchUpdate(...args: unknown[]) {
      return docsClientMocks.batchUpdate(...args);
    }

    listDriveFiles(...args: unknown[]) {
      return docsClientMocks.listDriveFiles(...args);
    }

    getStartPageToken(...args: unknown[]) {
      return docsClientMocks.getStartPageToken(...args);
    }

    listChanges(...args: unknown[]) {
      return docsClientMocks.listChanges(...args);
    }
  }
}));

import { createDocument } from './tools/create-document';
import { editDocument } from './tools/edit-document';
import { getDocument } from './tools/get-document';
import { listDocuments } from './tools/list-documents';
import { manageNamedRanges } from './tools/manage-named-ranges';
import { mergeTemplate } from './tools/merge-template';

let createCtx = <T extends Record<string, any>>(input: T) =>
  ({
    input,
    auth: {
      token: 'test-token'
    }
  }) as any;

let resetDocsClientMocks = () => {
  docsClientMocks.createDocument.mockReset();
  docsClientMocks.getDocument.mockReset();
  docsClientMocks.batchUpdate.mockReset();
  docsClientMocks.listDriveFiles.mockReset();
  docsClientMocks.getStartPageToken.mockReset();
  docsClientMocks.listChanges.mockReset();
  docsClientMocks.tokens.splice(0);
};

beforeEach(() => {
  resetDocsClientMocks();
});

describe('google-docs tool behavior', () => {
  it('creates documents and maps the response', async () => {
    docsClientMocks.createDocument.mockResolvedValueOnce({
      documentId: 'doc-123',
      title: 'Test Doc',
      revisionId: 'rev-1'
    });

    let result = await createDocument.handleInvocation(
      createCtx({
        title: 'Test Doc'
      })
    );

    expect(docsClientMocks.tokens).toEqual(['test-token']);
    expect(docsClientMocks.createDocument).toHaveBeenCalledWith('Test Doc');
    expect(result.output).toEqual({
      documentId: 'doc-123',
      title: 'Test Doc',
      revisionId: 'rev-1'
    });
    expect(result.message).toContain('Created document');
  });

  it('extracts plain text, body end index, and named ranges', async () => {
    docsClientMocks.getDocument.mockResolvedValueOnce({
      documentId: 'doc-123',
      title: 'Structured Doc',
      revisionId: 'rev-9',
      body: {
        content: [
          {
            endIndex: 6,
            paragraph: {
              elements: [{ textRun: { content: 'Hello ' } }]
            }
          },
          {
            endIndex: 12,
            table: {
              tableRows: [
                {
                  tableCells: [
                    {
                      content: [
                        {
                          paragraph: {
                            elements: [{ textRun: { content: 'World!' } }]
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        ]
      },
      namedRanges: {
        customerName: {
          namedRanges: [
            {
              namedRangeId: 'range-1',
              name: 'customerName',
              ranges: [{ startIndex: 1, endIndex: 6 }]
            }
          ]
        }
      }
    });

    let result = await getDocument.handleInvocation(
      createCtx({
        documentId: 'doc-123',
        includeContent: true
      })
    );

    expect(docsClientMocks.getDocument).toHaveBeenCalledWith('doc-123');
    expect(result.output).toMatchObject({
      documentId: 'doc-123',
      title: 'Structured Doc',
      revisionId: 'rev-9',
      plainText: 'Hello World!',
      bodyEndIndex: 12
    });
    expect(result.output.namedRanges).toEqual([
      {
        namedRangeId: 'range-1',
        name: 'customerName',
        startIndex: 1,
        endIndex: 6
      }
    ]);
  });

  it('builds batch update requests for edit operations', async () => {
    docsClientMocks.batchUpdate.mockResolvedValueOnce({
      documentId: 'doc-123',
      replies: [],
      writeControl: {
        targetRevisionId: 'rev-2'
      }
    });

    let result = await editDocument.handleInvocation(
      createCtx({
        documentId: 'doc-123',
        operations: [
          {
            type: 'insertText',
            text: 'Hello',
            index: 1
          },
          {
            type: 'formatText',
            startIndex: 1,
            endIndex: 6,
            style: {
              bold: true,
              fontSize: 12,
              link: 'https://example.com'
            }
          },
          {
            type: 'insertImage',
            imageUri: 'https://example.com/image.png',
            width: 120,
            height: 60
          },
          {
            type: 'removeBulletList',
            startIndex: 1,
            endIndex: 10
          }
        ]
      })
    );

    expect(docsClientMocks.batchUpdate).toHaveBeenCalledWith('doc-123', [
      {
        insertText: {
          text: 'Hello',
          location: { index: 1 }
        }
      },
      {
        updateTextStyle: {
          range: { startIndex: 1, endIndex: 6 },
          textStyle: {
            bold: true,
            fontSize: { magnitude: 12, unit: 'PT' },
            link: { url: 'https://example.com' }
          },
          fields: 'bold,fontSize,link'
        }
      },
      {
        insertInlineImage: {
          uri: 'https://example.com/image.png',
          endOfSegmentLocation: {},
          objectSize: {
            width: { magnitude: 120, unit: 'PT' },
            height: { magnitude: 60, unit: 'PT' }
          }
        }
      },
      {
        deleteParagraphBullets: {
          range: { startIndex: 1, endIndex: 10 }
        }
      }
    ]);
    expect(result.output).toEqual({
      documentId: 'doc-123',
      operationsExecuted: 4,
      revisionId: 'rev-2'
    });
  });

  it('builds replacement requests for template merging', async () => {
    docsClientMocks.batchUpdate.mockResolvedValueOnce({
      documentId: 'doc-merge',
      replies: []
    });

    let result = await mergeTemplate.handleInvocation(
      createCtx({
        documentId: 'doc-merge',
        replacements: [
          {
            placeholder: '{{name}}',
            value: 'Tobias'
          },
          {
            placeholder: '{{date}}',
            value: '2026-04-13',
            matchCase: false
          }
        ]
      })
    );

    expect(docsClientMocks.batchUpdate).toHaveBeenCalledWith('doc-merge', [
      {
        replaceAllText: {
          replaceText: 'Tobias',
          containsText: {
            text: '{{name}}',
            matchCase: true
          }
        }
      },
      {
        replaceAllText: {
          replaceText: '2026-04-13',
          containsText: {
            text: '{{date}}',
            matchCase: false
          }
        }
      }
    ]);
    expect(result.output.replacementsApplied).toBe(2);
  });

  it('lists docs with the expected Drive query and result mapping', async () => {
    docsClientMocks.listDriveFiles.mockResolvedValueOnce({
      files: [
        {
          id: 'doc-1',
          name: 'Proposal',
          modifiedTime: '2026-04-13T12:00:00.000Z',
          createdTime: '2026-04-10T12:00:00.000Z',
          webViewLink: 'https://docs.google.com/document/d/doc-1/edit',
          lastModifyingUser: {
            displayName: 'Editor',
            emailAddress: 'editor@example.com'
          }
        }
      ],
      nextPageToken: 'next-page'
    });

    let result = await listDocuments.handleInvocation(
      createCtx({
        searchQuery: "Quarterly's",
        folderId: 'folder-123',
        pageSize: 10,
        orderBy: 'name'
      })
    );

    expect(docsClientMocks.listDriveFiles).toHaveBeenCalledWith({
      query:
        "mimeType='application/vnd.google-apps.document' and name contains 'Quarterly\\'s' and 'folder-123' in parents",
      pageSize: 10,
      pageToken: undefined,
      orderBy: 'name'
    });
    expect(result.output).toEqual({
      documents: [
        {
          documentId: 'doc-1',
          name: 'Proposal',
          modifiedTime: '2026-04-13T12:00:00.000Z',
          createdTime: '2026-04-10T12:00:00.000Z',
          webViewLink: 'https://docs.google.com/document/d/doc-1/edit',
          lastModifiedBy: {
            name: 'Editor',
            email: 'editor@example.com'
          }
        }
      ],
      nextPageToken: 'next-page',
      totalCount: 1
    });
  });

  it('returns created named range ids from batch update replies', async () => {
    docsClientMocks.batchUpdate.mockResolvedValueOnce({
      documentId: 'doc-123',
      replies: [
        {
          createNamedRange: {
            namedRangeId: 'range-1'
          }
        },
        {},
        {
          createNamedRange: {
            namedRangeId: 'range-2'
          }
        }
      ]
    });

    let result = await manageNamedRanges.handleInvocation(
      createCtx({
        documentId: 'doc-123',
        operations: [
          {
            action: 'create',
            name: 'first',
            startIndex: 1,
            endIndex: 5
          },
          {
            action: 'delete',
            name: 'old-range'
          },
          {
            action: 'create',
            name: 'second',
            startIndex: 6,
            endIndex: 10
          }
        ]
      })
    );

    expect(docsClientMocks.batchUpdate).toHaveBeenCalledWith('doc-123', [
      {
        createNamedRange: {
          name: 'first',
          range: { startIndex: 1, endIndex: 5 }
        }
      },
      {
        deleteNamedRange: {
          name: 'old-range'
        }
      },
      {
        createNamedRange: {
          name: 'second',
          range: { startIndex: 6, endIndex: 10 }
        }
      }
    ]);
    expect(result.output).toEqual({
      documentId: 'doc-123',
      operationsApplied: 3,
      createdRangeIds: ['range-1', 'range-2']
    });
  });
});
