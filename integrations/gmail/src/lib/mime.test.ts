import { describe, expect, it } from 'vitest';
import {
  buildForwardedMimeMessage,
  decodeBase64Url,
  encodeBase64Url,
  hasMimeHeaderBodySeparator
} from './mime';

describe('Gmail MIME helpers', () => {
  it('round-trips base64url-encoded MIME bytes', () => {
    let raw = 'Subject: Example\r\n\r\nbody\u0000\u00ff';

    expect(decodeBase64Url(encodeBase64Url(raw))).toBe(raw);
  });

  it('recognizes the required RFC 2822 header/body separator', () => {
    expect(hasMimeHeaderBodySeparator('Subject: Example\r\n\r\n')).toBe(true);
    expect(hasMimeHeaderBodySeparator('Subject: Example\n\nbody')).toBe(true);
    expect(hasMimeHeaderBodySeparator('Subject: Example')).toBe(false);
  });

  it('rewrites forwarding headers while preserving the complete MIME body', () => {
    let boundary = 'original-boundary';
    let body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      'original body marker',
      `--${boundary}`,
      'Content-Type: application/octet-stream; name="payload.bin"',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="payload.bin"',
      '',
      'AAEC/w==',
      `--${boundary}--`
    ].join('\r\n');
    let original = [
      'From: sender@example.com',
      'To: original@example.com',
      'Subject: Original subject',
      'Message-ID: <original@example.com>',
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      body
    ].join('\r\n');

    let forwarded = buildForwardedMimeMessage({
      original,
      to: ['recipient@example.com'],
      cc: ['copy@example.com'],
      bcc: ['hidden@example.com']
    });
    let forwardedBody = forwarded.raw.slice(forwarded.raw.indexOf('\r\n\r\n') + 4);

    expect(forwarded.subject).toBe('Fwd: Original subject');
    expect(forwarded.raw).toContain('To: recipient@example.com\r\n');
    expect(forwarded.raw).toContain('Cc: copy@example.com\r\n');
    expect(forwarded.raw).toContain('Bcc: hidden@example.com\r\n');
    expect(forwarded.raw).toContain('Subject: Fwd: Original subject\r\n');
    expect(forwarded.raw).toContain(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    expect(forwarded.raw).not.toContain('From: sender@example.com');
    expect(forwarded.raw).not.toContain('Message-ID: <original@example.com>');
    expect(forwarded.raw).not.toContain('In-Reply-To:');
    expect(forwarded.raw).not.toContain('References:');
    expect(forwardedBody).toBe(body);
  });

  it('removes control characters from the forwarded subject header', () => {
    let forwarded = buildForwardedMimeMessage({
      original: 'Subject: Original\rBcc: injected@example.com\r\n\r\nbody',
      to: ['recipient@example.com']
    });

    expect(forwarded.subject).toBe('Fwd: Original Bcc: injected@example.com');
    expect(forwarded.raw).not.toContain('\rBcc: injected@example.com');
  });

  it('removes control characters from recipient headers so a CRLF recipient cannot inject a header', () => {
    let forwarded = buildForwardedMimeMessage({
      original: 'Subject: Original\r\n\r\nbody',
      to: ['recipient@example.com\r\nX-Injected: to@example.com'],
      cc: ['copy@example.com\rX-Injected: cc@example.com'],
      bcc: ['hidden@example.com\nX-Injected: bcc@example.com']
    });
    let headerBlock = forwarded.raw.slice(0, forwarded.raw.indexOf('\r\n\r\n'));
    let headerLines = headerBlock.split('\r\n');

    expect(headerLines).toContain('To: recipient@example.com X-Injected: to@example.com');
    expect(headerLines).toContain('Cc: copy@example.com X-Injected: cc@example.com');
    expect(headerLines).toContain('Bcc: hidden@example.com X-Injected: bcc@example.com');
    expect(headerLines.some(line => line.startsWith('X-Injected:'))).toBe(false);
  });

  it('keeps an existing Fwd: subject prefix instead of double-prefixing it', () => {
    let alreadyForwarded = buildForwardedMimeMessage({
      original: 'Subject: Fwd: Original subject\r\n\r\nbody',
      to: ['recipient@example.com']
    });
    let uppercase = buildForwardedMimeMessage({
      original: 'Subject:   FWD: Original subject\r\n\r\nbody',
      to: ['recipient@example.com']
    });

    expect(alreadyForwarded.subject).toBe('Fwd: Original subject');
    expect(alreadyForwarded.raw).toContain('Subject: Fwd: Original subject\r\n');
    expect(alreadyForwarded.raw).not.toContain('Fwd: Fwd:');
    expect(uppercase.subject).toBe('FWD: Original subject');
  });

  it('removes control characters from preserved MIME headers', () => {
    let forwarded = buildForwardedMimeMessage({
      original: [
        'Subject: Original',
        'MIME-Version: 1.0',
        'Content-Type: text/plain\rBcc: injected@example.com',
        '',
        'body'
      ].join('\r\n'),
      to: ['recipient@example.com']
    });

    expect(forwarded.raw).toContain('Content-Type: text/plain Bcc: injected@example.com\r\n');
    expect(forwarded.raw).not.toContain('\rBcc: injected@example.com');
  });
});
