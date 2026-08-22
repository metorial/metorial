export interface SlateAttachmentUrlContent {
  type: 'url';
  url: string;
}

export interface SlateAttachmentInlineContent {
  type: 'content';
  encoding: 'base64' | 'utf-8';
  content: string;
}

export interface SlateAttachment {
  mimeType?: string;
  attachmentHash?: string;
  content: SlateAttachmentUrlContent | SlateAttachmentInlineContent;
}

export let createUrlAttachment = (
  url: string,
  mimeType?: string,
  attachmentHash?: string
): SlateAttachment => ({
  mimeType,
  attachmentHash,
  content: {
    type: 'url',
    url
  }
});

export let createBase64Attachment = (
  content: string,
  mimeType?: string,
  attachmentHash?: string
): SlateAttachment => ({
  mimeType,
  attachmentHash,
  content: {
    type: 'content',
    encoding: 'base64',
    content
  }
});

export let createTextAttachment = (
  content: string,
  mimeType?: string,
  attachmentHash?: string
): SlateAttachment => ({
  mimeType,
  attachmentHash,
  content: {
    type: 'content',
    encoding: 'utf-8',
    content
  }
});
