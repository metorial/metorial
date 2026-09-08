export interface SlateAttachmentUrlContent {
  type: 'url';
  url: string;
  /**
   * Forwarded to the upstream request when the hub proxies this attachment. May contain
   * `$$MT$secret$authConfig$<path>` placeholders produced by redactUrlAttachmentSecrets() --
   * never the raw secret values themselves.
   */
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export interface SlateAttachmentInlineContent {
  type: 'content';
  encoding: 'base64' | 'utf-8';
  content: string;
}

export interface SlateAttachmentUploadReferenceContent {
  type: 'upload_reference';
  referenceId: string;
}

export interface SlateAttachment {
  mimeType?: string;
  attachmentHash?: string;
  content:
    | SlateAttachmentUrlContent
    | SlateAttachmentInlineContent
    | SlateAttachmentUploadReferenceContent;
}

export let createUrlAttachment = (
  url: string,
  opts: {
    mimeType?: string;
    attachmentHash?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  } = {}
): SlateAttachment => ({
  mimeType: opts.mimeType,
  attachmentHash: opts.attachmentHash,
  content: {
    type: 'url',
    url,
    ...(opts.headers ? { headers: opts.headers } : {}),
    ...(opts.query ? { query: opts.query } : {})
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
