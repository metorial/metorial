import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadAttachmentDirect } from './directUpload';

let live = {
  token: 'live-token',
  baseUrl: 'https://hub.example/',
  maxAttachmentSizeBytes: 10
};

describe('uploadAttachmentDirect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buffers streams and uploads them with their exact content length', async () => {
    let fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          attachments: [
            { referenceId: 'attachment-reference', uploadUrl: 'https://s3.example/upload' }
          ]
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    let body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4, 5]));
        controller.close();
      }
    });

    await expect(
      uploadAttachmentDirect({ live, body, mimeType: 'application/octet-stream' })
    ).resolves.toEqual({
      mimeType: 'application/octet-stream',
      content: { type: 'upload_reference', referenceId: 'attachment-reference' }
    });

    expect(JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string)).toEqual({
      attachments: [{ mimeType: 'application/octet-stream', sizeBytes: 5 }]
    });
    let upload = fetchSpy.mock.calls[1]!;
    expect(upload[0]).toBe('https://s3.example/upload');
    expect(upload[1]).toMatchObject({
      method: 'PUT',
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': '5'
      }
    });
    expect(new Uint8Array(upload[1]!.body as ArrayBuffer)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5])
    );
    expect(upload[1]).not.toHaveProperty('duplex');
  });

  it('rejects an oversized stream before registering an upload', async () => {
    let fetchSpy = vi.spyOn(globalThis, 'fetch');
    let body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(11));
      }
    });

    await expect(uploadAttachmentDirect({ live, body })).rejects.toThrow(
      'Attachment exceeds the maximum size of 10 bytes'
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uploads parts of a sized stream without buffering it and completes with receipts', async () => {
    let multipartLive = { ...live, maxAttachmentSizeBytes: 100 };
    let calls: { url: string; init: RequestInit }[] = [];
    let failedOnce = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      let url = String(input);
      calls.push({ url, init: init! });

      if (url === 'https://hub.example/slates-hub/live-invocation/attachments') {
        return Response.json({
          attachments: [
            {
              referenceId: 'ref',
              uploadMethod: 'MULTIPART',
              partSizeBytes: 4,
              partCount: 3,
              parts: [{ number: 1, url: 'http://upload/upload-part', headers: { m: 'm1' } }]
            }
          ]
        });
      }
      if (url.endsWith('/ref/parts')) {
        let { numbers } = JSON.parse(init!.body as string);
        return Response.json({
          parts: numbers.map((number: number) => ({
            number,
            url: 'http://upload/upload-part',
            headers: { m: `m${number}${failedOnce ? '-fresh' : ''}` }
          }))
        });
      }
      if (url === 'http://upload/upload-part') {
        let manifest = (init!.headers as Record<string, string>).m;
        if (manifest === 'm2' && !failedOnce) {
          failedOnce = true;
          return new Response(null, { status: 403 });
        }
        return Response.json({ receipt: `receipt-${manifest}` });
      }
      if (url.endsWith('/ref/complete')) return Response.json({ referenceId: 'ref' });
      throw new Error(`unexpected ${url}`);
    });

    let body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4, 5, 6]));
        controller.enqueue(new Uint8Array([7, 8, 9, 10]));
        controller.close();
      }
    });

    await expect(
      uploadAttachmentDirect({ live: multipartLive, body, sizeBytes: 10 })
    ).resolves.toEqual({
      mimeType: undefined,
      content: { type: 'upload_reference', referenceId: 'ref' }
    });

    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      attachments: [{ sizeBytes: 10 }]
    });

    let partBodies = calls
      .filter(call => call.url === 'http://upload/upload-part')
      .map(call => [...new Uint8Array(call.init.body as ArrayBuffer)]);
    expect(partBodies).toContainEqual([1, 2, 3, 4]);
    expect(partBodies).toContainEqual([9, 10]);

    let complete = calls.find(call => call.url.endsWith('/ref/complete'))!;
    expect(JSON.parse(complete.init.body as string).receipts).toEqual([
      'receipt-m1',
      'receipt-m2-fresh',
      'receipt-m3'
    ]);
  });

  it('discards the upload when a sized stream ends early', async () => {
    let fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          attachments: [{ referenceId: 'ref', uploadUrl: 'https://upload.example/put' }]
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    let body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.close();
      }
    });

    await expect(uploadAttachmentDirect({ live, body, sizeBytes: 5 })).rejects.toThrow(
      'Attachment ended before its declared size'
    );
    expect(fetchSpy.mock.calls[1]![0]).toBe(
      'https://hub.example/slates-hub/live-invocation/attachments/ref'
    );
    expect(fetchSpy.mock.calls[1]![1]).toMatchObject({ method: 'DELETE' });
  });

  it('rejects a sized stream that is larger than declared', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          attachments: [{ referenceId: 'ref', uploadUrl: 'https://upload.example/put' }]
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    let body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      }
    });

    await expect(uploadAttachmentDirect({ live, body, sizeBytes: 2 })).rejects.toThrow(
      'Attachment is larger than its declared size'
    );
  });

  it('keeps empty attachments inline', async () => {
    let fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      uploadAttachmentDirect({ live, body: new Uint8Array(0), mimeType: 'text/plain' })
    ).resolves.toEqual({
      mimeType: 'text/plain',
      content: { type: 'content', encoding: 'base64', content: '' }
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
