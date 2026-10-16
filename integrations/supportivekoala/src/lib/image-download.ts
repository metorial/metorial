import { createApiServiceError } from 'slates';

type AddAttachment = (attachment: { type: 'url'; url: string }) => Promise<unknown>;

export let prepareImageDownload = async (
  addAttachment: AddAttachment,
  imageUrl: string
): Promise<string> => {
  try {
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      throw createApiServiceError('The image URL is invalid.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      imageUrl.includes('[REDACTED]')
    ) {
      throw createApiServiceError('The image URL cannot be prepared for download.');
    }
    await addAttachment({ type: 'url', url: imageUrl });
    return 'The image download is prepared; availability is checked when downloaded.';
  } catch {
    return 'The image exists, but its download could not be prepared. Retrieve it by ID or contact Supportivekoala; do not generate it again solely to retry the download.';
  }
};
