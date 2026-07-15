import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let docsClientMocks = vi.hoisted(() => ({
  createDocumentFromMarkdown: vi.fn(),
  updateDocumentFromMarkdown: vi.fn(),
  tokens: [] as string[]
}));

vi.mock('./lib/client', async importOriginal => {
  let actual = await importOriginal<typeof import('./lib/client')>();

  return {
    ...actual,
    GoogleDocsClient: class {
      constructor(config: { token: string }) {
        docsClientMocks.tokens.push(config.token);
      }

      createDocumentFromMarkdown(...args: unknown[]) {
        return docsClientMocks.createDocumentFromMarkdown(...args);
      }

      updateDocumentFromMarkdown(...args: unknown[]) {
        return docsClientMocks.updateDocumentFromMarkdown(...args);
      }
    }
  };
});

import { GOOGLE_DOCS_MIME_TYPE } from './lib/client';
import { createDocumentMarkdown } from './tools/create-document-markdown';
import { MAX_MARKDOWN_BYTES } from './tools/markdown-input';
import { updateDocumentMarkdown } from './tools/update-document-markdown';

let createCtx = <T extends Record<string, unknown>>(input: T) =>
  ({
    input,
    auth: {
      token: 'test-token'
    }
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  docsClientMocks.tokens.splice(0);
});

describe('Google Docs Markdown tools', () => {
  it('creates a converted native document and maps Drive metadata', async () => {
    docsClientMocks.createDocumentFromMarkdown.mockResolvedValueOnce({
      id: 'doc-123',
      name: 'Quarterly plan',
      mimeType: GOOGLE_DOCS_MIME_TYPE,
      modifiedTime: '2026-07-14T10:00:00Z',
      webViewLink: 'https://docs.google.com/document/d/doc-123/edit'
    });

    let result = await createDocumentMarkdown.handleInvocation(
      createCtx({
        title: 'Quarterly plan',
        markdown: '# Plan\n\n- First'
      })
    );

    expect(docsClientMocks.tokens).toEqual(['test-token']);
    expect(docsClientMocks.createDocumentFromMarkdown).toHaveBeenCalledWith(
      'Quarterly plan',
      '# Plan\n\n- First'
    );
    expect(result.output).toEqual({
      documentId: 'doc-123',
      title: 'Quarterly plan',
      mimeType: GOOGLE_DOCS_MIME_TYPE,
      modifiedTime: '2026-07-14T10:00:00Z',
      webViewLink: 'https://docs.google.com/document/d/doc-123/edit'
    });
  });

  it('replaces an existing native document while preserving its ID', async () => {
    docsClientMocks.updateDocumentFromMarkdown.mockResolvedValueOnce({
      id: 'doc-123',
      name: 'Quarterly plan',
      mimeType: GOOGLE_DOCS_MIME_TYPE,
      modifiedTime: '2026-07-14T10:05:00Z'
    });

    let result = await updateDocumentMarkdown.handleInvocation(
      createCtx({
        documentId: 'doc-123',
        markdown: '# Replacement'
      })
    );

    expect(docsClientMocks.updateDocumentFromMarkdown).toHaveBeenCalledWith(
      'doc-123',
      '# Replacement'
    );
    expect(result.output).toMatchObject({
      documentId: 'doc-123',
      mimeType: GOOGLE_DOCS_MIME_TYPE
    });
    expect(result.message).toContain('preserving ID');
  });

  it('rejects whitespace-only Markdown with a ServiceError before making a request', async () => {
    await expect(
      createDocumentMarkdown.handleInvocation(
        createCtx({
          title: 'Quarterly plan',
          markdown: '  \n\t'
        })
      )
    ).rejects.toBeInstanceOf(ServiceError);

    expect(docsClientMocks.createDocumentFromMarkdown).not.toHaveBeenCalled();
  });

  it('rejects Markdown beyond the multipart limit (5 MiB minus 16 KiB headroom) before making a request', async () => {
    await expect(
      updateDocumentMarkdown.handleInvocation(
        createCtx({
          documentId: 'doc-123',
          markdown: 'a'.repeat(MAX_MARKDOWN_BYTES + 1)
        })
      )
    ).rejects.toMatchObject({
      data: {
        reason: 'markdown_too_large'
      }
    });

    expect(docsClientMocks.updateDocumentFromMarkdown).not.toHaveBeenCalled();
  });
});
