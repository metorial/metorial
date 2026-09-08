import { describe, expect, it } from 'vitest';
import type { SlateAttachment } from '../action/attachment';
import { AuthConfigSecretRedactor, redactUrlAttachmentSecrets } from './redact';

describe('AuthConfigSecretRedactor', () => {
  let authConfig = { token: '123SECRET', nested: { token2: 'also_secret' } };

  it('redacts values that match a secret to placeholders', () => {
    let redactor = new AuthConfigSecretRedactor(authConfig);

    expect(
      redactor.redact({
        headers: { Authorization: 'Bearer 123SECRET' },
        query: { key: 'also_secret' }
      })
    ).toEqual({
      headers: { Authorization: 'Bearer 123SECRET' }, // whole-value match only, not substring
      query: { key: '$$MT$secret$authConfig$nested.token2' }
    });
  });

  it('redacts a bare string value', () => {
    let redactor = new AuthConfigSecretRedactor(authConfig);
    expect(redactor.redact('123SECRET')).toBe('$$MT$secret$authConfig$token');
  });

  it('leaves non-secret strings untouched', () => {
    let redactor = new AuthConfigSecretRedactor(authConfig);
    expect(redactor.redact('https://example.com/file.pdf')).toBe(
      'https://example.com/file.pdf'
    );
  });

  it('recurses through arrays and nested objects', () => {
    let redactor = new AuthConfigSecretRedactor(authConfig);
    expect(redactor.redact({ list: ['also_secret', 'plain'] })).toEqual({
      list: ['$$MT$secret$authConfig$nested.token2', 'plain']
    });
  });

  it('never registers an empty-string secret', () => {
    let redactor = new AuthConfigSecretRedactor({ token: '' });
    expect(redactor.redact({ a: '', b: '' })).toEqual({ a: '', b: '' });
  });

  it('is a no-op when there is no auth config', () => {
    let redactor = new AuthConfigSecretRedactor(undefined);
    expect(redactor.redact({ a: 'b' })).toEqual({ a: 'b' });
  });
});

describe('redactUrlAttachmentSecrets', () => {
  let authConfig = { token: '123SECRET', nested: { token2: 'also_secret' } };

  let urlAttachment = (
    overrides: Partial<Extract<SlateAttachment['content'], { type: 'url' }>> = {}
  ): SlateAttachment => ({
    mimeType: 'application/pdf',
    content: { type: 'url', url: 'https://example.com/file.pdf', ...overrides }
  });

  it('redacts headers and query on url attachments', () => {
    let attachments: SlateAttachment[] = [
      urlAttachment({
        headers: { Authorization: 'Bearer 123SECRET' },
        query: { key: 'also_secret' }
      })
    ];

    expect(redactUrlAttachmentSecrets(attachments, authConfig)).toEqual([
      urlAttachment({
        headers: { Authorization: 'Bearer 123SECRET' },
        query: { key: '$$MT$secret$authConfig$nested.token2' }
      })
    ]);
  });

  it('leaves url attachments with no headers/query untouched', () => {
    let attachments = [urlAttachment()];
    expect(redactUrlAttachmentSecrets(attachments, authConfig)).toEqual(attachments);
  });

  it('leaves content and upload_reference attachments untouched', () => {
    let attachments: SlateAttachment[] = [
      {
        mimeType: 'text/plain',
        content: { type: 'content', encoding: 'utf-8', content: 'hi' }
      },
      { content: { type: 'upload_reference', referenceId: 'ref_1' } }
    ];

    expect(redactUrlAttachmentSecrets(attachments, authConfig)).toEqual(attachments);
  });

  it('is a no-op when there is no auth config', () => {
    let attachments = [urlAttachment({ headers: { Authorization: 'Bearer 123SECRET' } })];
    expect(redactUrlAttachmentSecrets(attachments, undefined)).toBe(attachments);
  });

  it('passes an undefined attachment list through unchanged', () => {
    expect(redactUrlAttachmentSecrets(undefined, authConfig)).toBeUndefined();
  });
});
