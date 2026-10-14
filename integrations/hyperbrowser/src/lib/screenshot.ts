import { createApiServiceError, type SlateAddAttachmentInput } from 'slates';

export let getScreenshotFile = (screenshot: string): SlateAddAttachmentInput => {
  if (/^https?:\/\//i.test(screenshot)) return { type: 'url', url: screenshot };

  let dataUrl = /^data:image\/(?:png|jpeg|webp);base64,(.+)$/s.exec(screenshot);
  let encoded = (dataUrl?.[1] ?? screenshot).replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw createApiServiceError(
      'Hyperbrowser returned screenshot data in an unsupported format.'
    );
  }
  let content = Buffer.from(encoded, 'base64');
  let format = content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'png'
    : content[0] === 255 && content[1] === 216 && content[2] === 255
      ? 'jpeg'
      : content.toString('ascii', 0, 4) === 'RIFF' &&
          content.toString('ascii', 8, 12) === 'WEBP'
        ? 'webp'
        : undefined;
  if (!format) {
    throw createApiServiceError(
      'Hyperbrowser returned screenshot data without a supported image format.'
    );
  }
  return {
    type: 'content',
    content: new Response(content, { headers: { 'content-type': `image/${format}` } }),
    mimeType: `image/${format}`,
    filename: `screenshot.${format}`
  };
};
