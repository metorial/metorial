export interface SlateAttachmentUrlContent {
  type: 'url';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  refreshReference?: unknown;
  refreshAt?: string;
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
    refreshReference?: unknown;
    refreshAt?: string;
  } = {}
): SlateAttachment => {
  if (opts.refreshReference !== undefined && !opts.refreshAt) {
    throw new Error('createUrlAttachment: refreshAt is required when refreshReference is set');
  }

  return {
    mimeType: opts.mimeType,
    attachmentHash: opts.attachmentHash,
    content: {
      type: 'url',
      url,
      ...(opts.headers ? { headers: opts.headers } : {}),
      ...(opts.query ? { query: opts.query } : {}),
      ...(opts.refreshReference !== undefined
        ? { refreshReference: opts.refreshReference }
        : {}),
      ...(opts.refreshAt ? { refreshAt: opts.refreshAt } : {})
    }
  };
};

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
