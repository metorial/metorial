import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let clientMocks = vi.hoisted(() => ({
  callRecordMethod: vi.fn()
}));

vi.mock('../lib/helpers', () => ({
  createClient: vi.fn(() => ({
    callRecordMethod: clientMocks.callRecordMethod
  }))
}));

import { downloadAttachment, ODOO_MAX_ATTACHMENT_BYTES } from './download-attachment';

let invocationContext = (input: Record<string, unknown>) =>
  ({
    input,
    auth: {
      token: 'test-key',
      username: 'bot@example.com',
      uid: 7,
      instanceUrl: 'https://odoo.example.com',
      transport: 'json2'
    },
    config: { instanceUrl: 'https://mutable.example.com' }
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('download_attachment input', () => {
  it('serializes to a top-level JSON Schema object', () => {
    let schema = z.toJSONSchema(downloadAttachment.inputSchema);

    expect(schema.type).toBe('object');
    expect(schema).not.toHaveProperty('oneOf');
    expect(schema).not.toHaveProperty('anyOf');
    expect(schema).not.toHaveProperty('allOf');
  });

  it.each([
    { attachmentId: 0 },
    { attachmentId: -1 },
    { attachmentId: 1.5 }
  ])('rejects an unsafe attachment ID %#', input => {
    expect(downloadAttachment.inputSchema.safeParse(input).success).toBe(false);
  });
});

describe('download_attachment invocation', () => {
  it('reads only attachment fields and returns file content separately from metadata', async () => {
    let contentBase64 = Buffer.from('invoice contents').toString('base64');
    let context = { lang: 'en_US', allowed_company_ids: [1, 2], bin_size: true };
    clientMocks.callRecordMethod.mockResolvedValue([
      {
        id: 42,
        name: 'invoice.pdf',
        mimetype: 'application/pdf',
        file_size: 16,
        type: 'binary',
        url: false,
        raw: contentBase64,
        checksum: 'abc123'
      }
    ]);

    let result = await downloadAttachment.handleInvocation(
      invocationContext({ attachmentId: 42, context })
    );

    expect(clientMocks.callRecordMethod).toHaveBeenCalledWith({
      model: 'ir.attachment',
      method: 'read',
      ids: [42],
      arguments: {
        fields: ['id', 'name', 'mimetype', 'file_size', 'type', 'url', 'checksum', 'raw'],
        load: null,
        context: { lang: 'en_US', allowed_company_ids: [1, 2], bin_size: false }
      },
      legacyKeywordArguments: {
        fields: ['id', 'name', 'mimetype', 'file_size', 'type', 'url', 'checksum', 'raw'],
        load: null,
        context: { lang: 'en_US', allowed_company_ids: [1, 2], bin_size: false }
      }
    });
    expect(result.output).toEqual({
      id: 42,
      fileName: 'invoice.pdf',
      mimeType: 'application/pdf',
      byteSize: 16,
      checksum: 'abc123',
      type: 'binary'
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'application/pdf',
        content: { type: 'content', encoding: 'base64', content: contentBase64 }
      }
    ]);
    expect(result.output).not.toHaveProperty('datas');
    expect(downloadAttachment.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it('returns an empty JSON-2 binary attachment when Odoo raw is an empty string', async () => {
    clientMocks.callRecordMethod.mockResolvedValue([
      {
        id: 42,
        name: 'empty.txt',
        mimetype: 'text/plain',
        file_size: 0,
        type: 'binary',
        url: false,
        raw: ''
      }
    ]);

    let result = await downloadAttachment.handleInvocation(
      invocationContext({ attachmentId: 42 })
    );

    expect(clientMocks.callRecordMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({ context: { bin_size: false } }),
        legacyKeywordArguments: expect.objectContaining({ context: { bin_size: false } })
      })
    );
    expect(result.output).toMatchObject({
      id: 42,
      fileName: 'empty.txt',
      mimeType: 'text/plain',
      byteSize: 0,
      type: 'binary'
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'text/plain',
        content: { type: 'content', encoding: 'base64', content: '' }
      }
    ]);
    expect(downloadAttachment.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it('rejects a URL-only record with direct Odoo and source guidance', async () => {
    clientMocks.callRecordMethod.mockResolvedValue([
      {
        id: 42,
        name: 'external.pdf',
        mimetype: 'application/pdf',
        file_size: 0,
        type: 'url',
        url: 'https://files.example.com/external.pdf',
        raw: false
      }
    ]);

    await expect(
      downloadAttachment.handleInvocation(invocationContext({ attachmentId: 42 }))
    ).rejects.toMatchObject({
      message: expect.stringContaining('https://files.example.com/external.pdf'),
      data: { reason: 'odoo_attachment_url_only' }
    });
  });

  it('rejects missing binary content with a direct Odoo record link', async () => {
    clientMocks.callRecordMethod.mockResolvedValue([
      {
        id: 42,
        name: 'missing.pdf',
        mimetype: 'application/pdf',
        file_size: 0,
        type: 'binary',
        url: false,
        raw: false
      }
    ]);

    await expect(
      downloadAttachment.handleInvocation(invocationContext({ attachmentId: 42 }))
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        'https://odoo.example.com/web#id=42&model=ir.attachment&view_type=form'
      ),
      data: { reason: 'odoo_attachment_content_missing' }
    });
  });

  it('rejects malformed base64 returned by Odoo', async () => {
    clientMocks.callRecordMethod.mockResolvedValue([
      {
        id: 42,
        name: 'broken.pdf',
        mimetype: 'application/pdf',
        file_size: 3,
        type: 'binary',
        raw: '%%%not-base64%%%'
      }
    ]);

    await expect(
      downloadAttachment.handleInvocation(invocationContext({ attachmentId: 42 }))
    ).rejects.toMatchObject({ data: { reason: 'odoo_attachment_content_invalid' } });
  });

  it('rejects actual decoded content above the safe download limit before decoding it', async () => {
    let oversizedBase64 = 'A'.repeat(Math.ceil((ODOO_MAX_ATTACHMENT_BYTES + 1) / 3) * 4);
    clientMocks.callRecordMethod.mockResolvedValue([
      {
        id: 42,
        name: 'too-large.bin',
        mimetype: 'application/octet-stream',
        file_size: ODOO_MAX_ATTACHMENT_BYTES,
        type: 'binary',
        raw: oversizedBase64
      }
    ]);

    await expect(
      downloadAttachment.handleInvocation(invocationContext({ attachmentId: 42 }))
    ).rejects.toMatchObject({ data: { reason: 'odoo_attachment_too_large' } });
  });

  it('wraps unexpected upstream failures as provider ServiceErrors', async () => {
    clientMocks.callRecordMethod.mockRejectedValue(new Error('connection reset'));

    await expect(
      downloadAttachment.handleInvocation(invocationContext({ attachmentId: 42 }))
    ).rejects.toMatchObject({ data: { reason: 'odoo_download_attachment_failed' } });
  });

  it('uses datas for attachment content on legacy JSON-RPC connections', async () => {
    let contentBase64 = Buffer.from('legacy contents').toString('base64');
    clientMocks.callRecordMethod.mockResolvedValue([
      {
        id: 42,
        name: 'legacy.txt',
        mimetype: 'text/plain',
        file_size: 15,
        type: 'binary',
        datas: contentBase64
      }
    ]);

    let context = invocationContext({ attachmentId: 42 }) as unknown as {
      auth: { transport?: string };
    };
    context.auth.transport = 'jsonrpc';
    let result = await downloadAttachment.handleInvocation(context as never);

    expect(clientMocks.callRecordMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          fields: ['id', 'name', 'mimetype', 'file_size', 'type', 'url', 'checksum', 'datas']
        })
      })
    );
    expect(result.attachments).toEqual([
      {
        mimeType: 'text/plain',
        content: { type: 'content', encoding: 'base64', content: contentBase64 }
      }
    ]);
  });
});
