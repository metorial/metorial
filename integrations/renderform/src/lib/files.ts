import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

let MAX_FILE_BYTES = 50 * 1024 * 1024;

// RenderForm's official responses use this host. Do not send account credentials to it.
export let readGeneratedFile = async (href: string) => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw createApiServiceError('RenderForm returned an invalid file URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'cdn.renderform.io' ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw createApiServiceError(
      'RenderForm returned a file URL outside its documented HTTPS download host.'
    );
  }
  try {
    let client = createAxios({
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: MAX_FILE_BYTES,
      headers: {}
    });
    let response = await client.get<ArrayBuffer>(url.href, { responseType: 'arraybuffer' });
    let bytes = new Uint8Array(response.data);
    if (bytes.length === 0 || bytes.length > MAX_FILE_BYTES)
      throw createApiServiceError(
        'The generated file is empty or exceeds the 50 MiB download limit.'
      );
    let start = Buffer.from(bytes.subarray(0, 16));
    let mimeType: string | undefined;
    let extension: string | undefined;
    if (start.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      mimeType = 'image/png';
      extension = 'png';
    } else if (start[0] === 255 && start[1] === 216 && start[2] === 255) {
      mimeType = 'image/jpeg';
      extension = 'jpg';
    } else if (
      start.subarray(0, 4).toString() === 'RIFF' &&
      start.subarray(8, 12).toString() === 'WEBP'
    ) {
      mimeType = 'image/webp';
      extension = 'webp';
    } else if (start.subarray(0, 5).toString() === '%PDF-') {
      mimeType = 'application/pdf';
      extension = 'pdf';
    } else if (start.subarray(4, 8).toString() === 'ftyp') {
      mimeType = 'video/mp4';
      extension = 'mp4';
    } else if (start.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) {
      mimeType = 'video/webm';
      extension = 'webm';
    }
    if (!mimeType || !extension)
      throw createApiServiceError(
        'RenderForm did not return a supported image, PDF, or video file.'
      );
    return {
      content: new Response(bytes, { headers: { 'Content-Type': mimeType } }),
      mimeType,
      extension
    };
  } catch (error) {
    throw buildApiServiceError(error, {
      providerLabel: 'RenderForm',
      reason: 'file_preparation_failed',
      operation: 'file retrieval',
      extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
    });
  }
};

export let prepareGeneratedFile = async (
  ctx: {
    addAttachment: (file: {
      type: 'content';
      content: Response;
      mimeType: string;
      filename: string;
    }) => Promise<unknown>;
  },
  result: { requestId: string; href: string; status?: string },
  asynchronous = false
) => {
  if (asynchronous || (result.status !== undefined && result.status !== 'done')) {
    return {
      downloadPrepared: false,
      downloadWarning:
        'The request was accepted but the file is not confirmed ready. Use get_result to check its status and prepare the completed file.'
    };
  }
  try {
    let file = await readGeneratedFile(result.href);
    let name = result.requestId.replace(/[^a-zA-Z0-9._-]/g, '_');
    await ctx.addAttachment({
      type: 'content',
      content: file.content,
      mimeType: file.mimeType,
      filename: `${name}.${file.extension}`
    });
    return {
      downloadPrepared: true,
      downloadWarning:
        'File content was retrieved and prepared. Download availability is not yet verified.'
    };
  } catch {
    return {
      downloadPrepared: false,
      downloadWarning:
        'The provider request succeeded, but the file could not be prepared for download. The original result URL is preserved; use get_result to retry retrieval without generating again. Provider retention limits still apply.'
    };
  }
};
