import { createApiServiceError } from 'slates';

type ReceiptSourceInput = {
  sourceUrl?: string;
  image?: string;
  filename?: string;
  contentType?: string;
  customHeaderKey?: string;
};

export type ReceiptSource =
  | {
      type: 'url';
      sourceUrl: string;
      customHeaderKey?: string;
    }
  | {
      type: 'base64';
      image: string;
      filename: string;
      contentType: string;
    };

export let requireReceiptSource = (input: ReceiptSourceInput): ReceiptSource => {
  let hasUrl = !!input.sourceUrl;
  let hasBase64 = !!input.image;

  if (!hasUrl && !hasBase64) {
    throw createApiServiceError('Either sourceUrl or image (base64) must be provided.');
  }

  if (hasUrl && hasBase64) {
    throw createApiServiceError('Provide only one of sourceUrl or image (base64).');
  }

  if (hasUrl) {
    return {
      type: 'url',
      sourceUrl: input.sourceUrl!,
      customHeaderKey: input.customHeaderKey
    };
  }

  if (!input.filename || !input.contentType) {
    throw createApiServiceError(
      'filename and contentType are required when using base64 image input.'
    );
  }

  return {
    type: 'base64',
    image: input.image!,
    filename: input.filename,
    contentType: input.contentType
  };
};
