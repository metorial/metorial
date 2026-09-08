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
    expect(upload[1]!.body).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
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
});
