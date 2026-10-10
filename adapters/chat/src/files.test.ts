import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatError } from './errors';
import {
  attachmentTypeForMime,
  DOWNLOAD_URL_REFRESH_MARGIN_MS,
  downloadUrlRefreshAt,
  fetchAttachmentSource,
  signedUrlHexExpiry
} from './files';

let action = 'metorial_chat$file.upload';

let stubFetch = (
  respond: (url: string, init?: RequestInit) => Promise<Response> | Response
) => {
  let fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) =>
    respond(String(input), init)
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

let catchChatError = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    if (ChatError.is(error)) return error;
    throw error;
  }
  throw new Error('Expected a ChatError');
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('attachmentTypeForMime', () => {
  it('maps MIME families', () => {
    expect(attachmentTypeForMime('image/png')).toBe('image');
    expect(attachmentTypeForMime('video/mp4')).toBe('video');
    expect(attachmentTypeForMime('audio/mpeg')).toBe('audio');
    expect(attachmentTypeForMime('application/pdf')).toBe('file');
    expect(attachmentTypeForMime(undefined)).toBe('file');
    expect(attachmentTypeForMime(null)).toBe('file');
  });
});

describe('signedUrlHexExpiry', () => {
  it('reads a hex Unix-seconds expiry parameter', () => {
    expect(
      signedUrlHexExpiry('https://cdn.discordapp.com/a/b/c.png?ex=7fffffff&is=1', 'ex')
    ).toEqual(new Date(0x7fffffff * 1000));
    expect(
      signedUrlHexExpiry('https://scontent.xx.fbcdn.net/v/x.jpg?oe=6553F100', 'oe')
    ).toEqual(new Date(0x6553f100 * 1000));
  });

  it('ignores missing, malformed, and zero values', () => {
    expect(signedUrlHexExpiry('https://cdn.discordapp.com/a.png', 'ex')).toBeUndefined();
    expect(signedUrlHexExpiry('https://cdn.discordapp.com/a.png?ex=zz', 'ex')).toBeUndefined();
    expect(signedUrlHexExpiry('https://cdn.discordapp.com/a.png?ex=0', 'ex')).toBeUndefined();
    expect(signedUrlHexExpiry('not a url', 'ex')).toBeUndefined();
  });
});

describe('downloadUrlRefreshAt', () => {
  it('renews a margin before expiry, and immediately once that has passed', () => {
    let expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    expect(downloadUrlRefreshAt(expiresAt)).toBe(
      new Date(expiresAt.getTime() - DOWNLOAD_URL_REFRESH_MARGIN_MS).toISOString()
    );
    expect(downloadUrlRefreshAt(expiresAt, 1000)).toBe(
      new Date(expiresAt.getTime() - 1000).toISOString()
    );
    let soon = Date.parse(downloadUrlRefreshAt(new Date(Date.now() + 1000)));
    expect(Math.abs(soon - Date.now())).toBeLessThan(1000);
  });
});

describe('fetchAttachmentSource', () => {
  it('returns bytes and content type with a timeout signal', async () => {
    let fetchMock = stubFetch(
      () => new Response('hello', { headers: { 'content-type': 'text/plain' } })
    );
    let source = await fetchAttachmentSource('https://files.example.com/a.txt', {
      action,
      maxBytes: 10
    });
    expect(new TextDecoder().decode(source.bytes)).toBe('hello');
    expect(source.contentType).toBe('text/plain');
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects non-HTTP(S) URLs before fetching', async () => {
    let fetchMock = stubFetch(() => new Response('x'));
    for (let url of ['file:///etc/passwd', 'data:text/plain,hi', 'not a url']) {
      let error = await catchChatError(fetchAttachmentSource(url, { action }));
      expect(error.chat.code).toBe('chat.input.invalid');
      expect(error.data.issues?.[0]?.path).toEqual(['fileUrl']);
    }
    let named = await catchChatError(
      fetchAttachmentSource('ftp://x', { action, field: 'sourceUrl' })
    );
    expect(named.message).toBe('sourceUrl must be an HTTP(S) URL.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports fetch failures and HTTP errors as download failures', async () => {
    stubFetch(() => Promise.reject(new TypeError('fetch failed')));
    let network = await catchChatError(
      fetchAttachmentSource('https://files.example.com/a', { action, attachmentId: 'a.txt' })
    );
    expect(network.chat).toMatchObject({
      code: 'chat.attachment.download_failed',
      action,
      target: { type: 'attachment', id: 'a.txt' }
    });

    stubFetch(() => new Response('gone', { status: 403 }));
    let http = await catchChatError(
      fetchAttachmentSource('https://files.example.com/a', { action })
    );
    expect(http.chat.code).toBe('chat.attachment.download_failed');
    expect(http.message).toBe('Could not fetch the file from its source URL: HTTP 403.');
  });

  it('times out slow sources', async () => {
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    );
    let error = await catchChatError(
      fetchAttachmentSource('https://files.example.com/a', { action, timeoutMs: 10 })
    );
    expect(error.chat.code).toBe('chat.attachment.download_failed');
  });

  it('enforces the declared and actual size', async () => {
    stubFetch(() => new Response('0123456789', { headers: { 'content-length': '100' } }));
    let declared = await catchChatError(
      fetchAttachmentSource('https://files.example.com/a', {
        action,
        maxBytes: 50,
        attachmentId: 'a.bin',
        tooLargeMessage: 'Too big for this provider.'
      })
    );
    expect(declared.chat).toMatchObject({
      code: 'chat.attachment.too_large',
      limit: { name: 'attachment_bytes', max: 50, actual: 100 },
      target: { type: 'attachment', id: 'a.bin' }
    });
    expect(declared.message).toBe('Too big for this provider.');

    stubFetch(() => new Response('0123456789'));
    let actual = await catchChatError(
      fetchAttachmentSource('https://files.example.com/a', { action, maxBytes: 4 })
    );
    expect(actual.chat.limit).toEqual({ name: 'attachment_bytes', max: 4, actual: 10 });
  });

  it('stops reading a source without content-length once it passes the limit', async () => {
    let pulls = 0;
    let cancelled = false;
    let body = new ReadableStream<Uint8Array>({
      pull: controller => {
        pulls++;
        controller.enqueue(new Uint8Array(4));
      },
      cancel: () => {
        cancelled = true;
      }
    });
    stubFetch(() => new Response(body));
    let error = await catchChatError(
      fetchAttachmentSource('https://files.example.com/a', { action, maxBytes: 10 })
    );
    expect(error.chat.code).toBe('chat.attachment.too_large');
    expect(error.chat.limit).toEqual({ name: 'attachment_bytes', max: 10, actual: 12 });
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(6);
  });

  it('chooses the limit from the content type', async () => {
    stubFetch(() => new Response('0123456789', { headers: { 'content-type': 'image/png' } }));
    let maxBytes = vi.fn((contentType: string | undefined) =>
      contentType === 'image/png' ? 5 : 100
    );
    let error = await catchChatError(
      fetchAttachmentSource('https://files.example.com/a', { action, maxBytes })
    );
    expect(maxBytes).toHaveBeenCalledWith('image/png');
    expect(error.chat.limit?.max).toBe(5);
  });
});
