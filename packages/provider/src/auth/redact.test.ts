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

describe('AuthConfigSecretRedactor.redactEmbedded', () => {
  it('preserves the legacy placeholder format for whole-value matches', () => {
    let redactor = new AuthConfigSecretRedactor({
      token: 'ABC',
      nested: { tokens: ['XYZ'] }
    });

    expect(redactor.redactEmbedded({ values: ['ABC', 'XYZ', 'plain', 42, null] })).toEqual({
      values: [
        '$$MT$secret$authConfig$token',
        '$$MT$secret$authConfig$nested.tokens.0',
        'plain',
        42,
        null
      ]
    });
  });

  it('terminates embedded placeholders before prefixes, suffixes, and adjacent literals', () => {
    let redactor = new AuthConfigSecretRedactor({ token: 'ABC', token2: 'XYZ' });

    expect(
      redactor.redactEmbedded({
        bearer: 'Bearer ABC',
        suffix: 'ABC2',
        multiple: 'ABC:XYZ:ABC',
        adjacent: 'ABCXYZ'
      })
    ).toEqual({
      bearer: 'Bearer $$MT$secret$authConfig$token$$',
      suffix: '$$MT$secret$authConfig$token$$2',
      multiple:
        '$$MT$secret$authConfig$token$$:$$MT$secret$authConfig$token2$$:$$MT$secret$authConfig$token$$',
      adjacent: '$$MT$secret$authConfig$token$$$$MT$secret$authConfig$token2$$'
    });
  });

  it('matches overlapping secrets longest-first', () => {
    let redactor = new AuthConfigSecretRedactor({ token: 'ABC', longer: 'ABC2' });

    expect(redactor.redactEmbedded('ABC2 ABC')).toBe(
      '$$MT$secret$authConfig$longer$$ $$MT$secret$authConfig$token$$'
    );
    expect(redactor.redactEmbedded('ABC2')).toBe('$$MT$secret$authConfig$longer');
  });

  it('does not scan emitted placeholders again', () => {
    let redactor = new AuthConfigSecretRedactor({ token: 'ABC', other: 'token' });

    expect(redactor.redactEmbedded('Bearer ABC token')).toBe(
      'Bearer $$MT$secret$authConfig$token$$ $$MT$secret$authConfig$other$$'
    );
  });

  it.each([
    '.',
    '*',
    '+',
    '?',
    '^',
    '$',
    '{',
    '}',
    '(',
    ')',
    '|',
    '[',
    ']',
    '\\'
  ])('treats %s literally in secret values', character => {
    let secret = `${character}secret`;
    let redactor = new AuthConfigSecretRedactor({ token: secret });

    expect(redactor.redactEmbedded(`prefix ${secret} suffix`)).toBe(
      'prefix $$MT$secret$authConfig$token$$ suffix'
    );
    expect(redactor.redactEmbedded('prefix secret suffix')).toBe('prefix secret suffix');
  });

  it('ignores empty secrets and leaves unrelated values unchanged', () => {
    let redactor = new AuthConfigSecretRedactor({ empty: '', token: 'ABC' });

    expect(redactor.redactEmbedded({ empty: '', plain: 'plain', token: 'ABC' })).toEqual({
      empty: '',
      plain: 'plain',
      token: '$$MT$secret$authConfig$token'
    });
    expect(new AuthConfigSecretRedactor({ empty: '' }).redactEmbedded('plain')).toBe('plain');
    expect(new AuthConfigSecretRedactor(undefined).redactEmbedded('plain')).toBe('plain');
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
        headers: { Authorization: 'Bearer $$MT$secret$authConfig$token$$' },
        query: { key: '$$MT$secret$authConfig$nested.token2' }
      })
    ]);
  });

  it('only changes header and query values, preserving metadata and the original attachment', () => {
    let attachment: SlateAttachment = {
      mimeType: 'application/pdf',
      attachmentHash: 'file-hash',
      content: {
        type: 'url',
        url: 'https://example.com/123SECRET/file.pdf',
        headers: { Authorization: 'Bearer 123SECRET' },
        query: { key: 'also_secret-suffix' },
        refreshReference: { id: 'file-1' },
        refreshAt: '2026-09-10T00:00:00Z'
      }
    };
    let original = structuredClone(attachment);

    expect(redactUrlAttachmentSecrets([attachment], authConfig)).toEqual([
      {
        ...original,
        content: {
          ...original.content,
          headers: { Authorization: 'Bearer $$MT$secret$authConfig$token$$' },
          query: { key: '$$MT$secret$authConfig$nested.token2$$-suffix' }
        }
      }
    ]);
    expect(attachment).toEqual(original);
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
