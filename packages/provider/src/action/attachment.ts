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
  content: SlateAttachmentUrlContent | SlateAttachmentInlineContent;
}

export let createUrlAttachment = (url: string, mimeType?: string): SlateAttachment => ({
  mimeType,
  content: {
    type: 'url',
    url
  }
});

export let createBase64Attachment = (content: string, mimeType?: string): SlateAttachment => ({
  mimeType,
  content: {
    type: 'content',
    encoding: 'base64',
    content
  }
});

export let createTextAttachment = (content: string, mimeType?: string): SlateAttachment => ({
  mimeType,
  content: {
    type: 'content',
    encoding: 'utf-8',
    content
  }
});
