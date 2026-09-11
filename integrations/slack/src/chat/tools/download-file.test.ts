import { getChatErrorInfo } from '@slates/adapter-chat';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlackClient } from '../../lib/client';
import { chatDownloadFile } from './download-file';

let SLACK_MAX_PROXIED_ATTACHMENT_BYTES = 500 * 1024 * 1024;

let createContext = (providerFileReference: unknown) => ({
  auth: { token: 'xoxb-access-token' },
  config: {},
  input: { providerFileReference },
  addAttachment: vi.fn()
});

describe('Slack chat file download', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the stable Slack URL without downloading its content', async () => {
    let file = {
      id: 'F123',
      name: 'report.pdf',
      mimetype: 'application/pdf',
      size: 1234,
      url_private_download: 'https://files.slack.com/files-pri/T123-F123/report.pdf'
    };
    vi.spyOn(SlackClient.prototype, 'getFileInfo').mockResolvedValue(file);
    let downloadSpy = vi.spyOn(SlackClient.prototype, 'downloadFile');
    let ctx = createContext({ fileId: file.id });

    let result = await chatDownloadFile.handleInvocation(ctx as any);

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(ctx.addAttachment).toHaveBeenCalledWith({
      type: 'url',
      url: file.url_private_download,
      mimeType: file.mimetype,
      headers: { Authorization: 'Bearer xoxb-access-token' }
    });
    expect(result).not.toHaveProperty('attachments');
    expect(result.output.attachment).toMatchObject({
      id: file.id,
      name: file.name,
      mimeType: file.mimetype,
      size: file.size,
      providerFileReference: { fileId: file.id }
    });
  });

  it('rejects a provider-reported oversized file before registering it', async () => {
    vi.spyOn(SlackClient.prototype, 'getFileInfo').mockResolvedValue({
      id: 'F123',
      size: SLACK_MAX_PROXIED_ATTACHMENT_BYTES + 1,
      url_private_download: 'https://files.slack.com/files-pri/T123-F123/large.bin'
    });
    let ctx = createContext({ fileId: 'F123' });

    let error = await chatDownloadFile.handleInvocation(ctx as any).catch(error => error);

    expect(getChatErrorInfo(error)).toMatchObject({
      code: 'chat.attachment.too_large',
      limit: {
        name: 'attachment_bytes',
        max: SLACK_MAX_PROXIED_ATTACHMENT_BYTES,
        actual: SLACK_MAX_PROXIED_ATTACHMENT_BYTES + 1
      }
    });
    expect(ctx.addAttachment).not.toHaveBeenCalled();
  });
});
