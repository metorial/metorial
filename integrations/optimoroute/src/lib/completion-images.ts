import { createApiServiceError, isApiErrorRecord } from 'slates';

export type CompletionImage = {
  url: string;
  mimeType: string;
  path: (string | number)[];
};

export let getCompletionImages = (data: unknown): CompletionImage[] => {
  if (!isApiErrorRecord(data) || !isApiErrorRecord(data.form)) return [];
  let images: CompletionImage[] = [];
  let addImage = (image: unknown, path: (string | number)[]) => {
    if (!isApiErrorRecord(image) || typeof image.url !== 'string') return;
    let url: URL;
    try {
      url = new URL(image.url);
    } catch {
      throw createApiServiceError(
        'OptimoRoute returned an invalid proof-of-delivery image URL.'
      );
    }
    if (url.protocol !== 'https:') {
      throw createApiServiceError(
        'OptimoRoute returned an insecure proof-of-delivery image URL.'
      );
    }
    images.push({
      url: image.url,
      mimeType: typeof image.type === 'string' ? image.type : 'application/octet-stream',
      path
    });
  };
  addImage(data.form.signature, ['form', 'signature']);
  if (Array.isArray(data.form.images)) {
    data.form.images.forEach((image, index) => addImage(image, ['form', 'images', index]));
  }
  for (let field of ['barcode', 'barcode_collections']) {
    let barcodes = data.form[field];
    if (!Array.isArray(barcodes)) continue;
    barcodes.forEach((barcode, barcodeIndex) => {
      if (!isApiErrorRecord(barcode) || !isApiErrorRecord(barcode.scanInfo)) return;
      if (!Array.isArray(barcode.scanInfo.images)) return;
      barcode.scanInfo.images.forEach((image, index) =>
        addImage(image, ['form', field, barcodeIndex, 'scanInfo', 'images', index])
      );
    });
  }
  return images;
};

export let getCompletionImageRefreshAt = (imageUrl: string) => {
  let url = new URL(imageUrl);
  let signedAt = url.searchParams.get('X-Amz-Date');
  let lifetime = Number(url.searchParams.get('X-Amz-Expires'));
  let expiry: number | undefined;
  if (signedAt && /^\d{8}T\d{6}Z$/.test(signedAt) && lifetime > 0) {
    let issued = Date.parse(
      `${signedAt.slice(0, 4)}-${signedAt.slice(4, 6)}-${signedAt.slice(6, 8)}T${signedAt.slice(9, 11)}:${signedAt.slice(11, 13)}:${signedAt.slice(13, 15)}Z`
    );
    let value = issued + lifetime * 1000;
    if (Number.isFinite(value) && Math.abs(value) <= 8.64e15) expiry = value;
  }
  // The API guarantees at least five days for URLs without explicit expiry metadata.
  return new Date(
    expiry === undefined ? Date.now() + 4 * 86400000 : expiry - 60_000
  ).toISOString();
};
