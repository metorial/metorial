import { describe, expect, it } from 'vitest';
import { getBase64ByteLength, getResponseHeaderValue } from './index';

describe('file helpers', () => {
  it('finds response headers case-insensitively from plain objects', () => {
    expect(
      getResponseHeaderValue(
        {
          'Content-Type': 'application/pdf',
          'x-empty': ''
        },
        'content-type'
      )
    ).toBe('application/pdf');
    expect(getResponseHeaderValue({ 'x-empty': '' }, 'X-Empty')).toBe('');
  });

  it('returns the first string value from array headers', () => {
    expect(
      getResponseHeaderValue({ 'content-type': ['text/plain', 'text/html'] }, 'content-type')
    ).toBe('text/plain');
    expect(
      getResponseHeaderValue({ 'content-type': [123, 'text/html'] }, 'content-type')
    ).toBe('text/html');
  });

  it('supports Headers-like objects', () => {
    let headers = new Headers({ 'content-type': 'image/png' });

    expect(getResponseHeaderValue(headers, 'Content-Type')).toBe('image/png');
  });

  it('computes decoded base64 byte length', () => {
    expect(getBase64ByteLength(Buffer.from('hello').toString('base64'))).toBe(5);
  });
});
