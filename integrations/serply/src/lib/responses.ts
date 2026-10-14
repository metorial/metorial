import { createApiServiceError, isApiErrorRecord } from 'slates';

let resultRecord = (value: unknown) => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('Serply returned an invalid search result. Try again.', {
      reason: 'invalid_serply_response'
    });
  }
  return value;
};

let optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
let optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
let optionalNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    typeof value === 'string' &&
    /^\d+(?:\.\d+)?$/.test(value.trim()) &&
    Number.isFinite(Number(value))
  )
    return Number(value);
  return undefined;
};

export let searchResultArray = (value: unknown): unknown[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw createApiServiceError('Serply returned an invalid result list. Try again.', {
      reason: 'invalid_serply_response'
    });
  }
  return value;
};

export let normalizeImageResult = (value: unknown) => {
  let data = resultRecord(value);
  let image = isApiErrorRecord(data.image) ? data.image : {};
  let link = isApiErrorRecord(data.link) ? data.link : {};
  let original = isApiErrorRecord(data.original_image) ? data.original_image : {};
  let thumbnails = isApiErrorRecord(data.thumbnails) ? data.thumbnails : {};
  return {
    ...data,
    title:
      optionalString(data.title) ?? optionalString(link.title) ?? optionalString(image.alt),
    link:
      optionalString(data.link) ?? optionalString(original.src) ?? optionalString(link.href),
    description: optionalString(data.description) ?? optionalString(image.alt),
    thumbnailUrl:
      optionalString(data.thumbnailUrl) ??
      optionalString(thumbnails.small) ??
      optionalString(image.src),
    source: optionalString(data.source) ?? optionalString(link.domain),
    width: optionalNumber(data.width) ?? optionalNumber(original.width),
    height: optionalNumber(data.height) ?? optionalNumber(original.height)
  };
};

export let normalizeProductResult = (value: unknown) => {
  let data = resultRecord(value);
  let rating =
    typeof data.rating_stars === 'string' ? /^\d+(?:\.\d+)?/.exec(data.rating_stars) : null;
  return {
    ...data,
    price:
      optionalString(data.price) ??
      (typeof data.price === 'number' ? String(data.price) : undefined),
    imageUrl: optionalString(data.imageUrl) ?? optionalString(data.img_url),
    rating: optionalNumber(data.rating) ?? (rating ? Number(rating[0]) : undefined),
    reviewCount: optionalNumber(data.reviewCount) ?? optionalNumber(data.review_count),
    position: optionalNumber(data.position) ?? optionalNumber(data.real_position),
    isPrime: optionalBoolean(data.isPrime) ?? optionalBoolean(data.prime),
    isBestseller: optionalBoolean(data.isBestseller) ?? optionalBoolean(data.bestseller),
    isSponsored: optionalBoolean(data.isSponsored) ?? optionalBoolean(data.is_sponsor)
  };
};

export let normalizeNewsEntry = (value: unknown) => {
  let data = resultRecord(value);
  let source = isApiErrorRecord(data.source) ? data.source : {};
  return {
    ...data,
    source: optionalString(data.source) ?? optionalString(source.title)
  };
};

export let normalizeBingShoppingAd = (value: unknown) => {
  let data = resultRecord(value);
  return { ...data, originalPrice: optionalString(data.originalPrice) };
};

export let normalizeJobResult = (value: unknown) => {
  let data = resultRecord(value);
  return {
    ...data,
    position: optionalString(data.position),
    link: optionalString(data.link)
  };
};

export let normalizeRankingDetails = (value: unknown) => {
  let data = resultRecord(value);
  let position = data.position;
  let searchedResults = data.searched_results;
  return {
    position:
      typeof position === 'string' &&
      /^-?\d+$/.test(position) &&
      Number.isFinite(Number(position))
        ? Number(position)
        : optionalNumber(position),
    searchedResults: optionalNumber(searchedResults),
    website: optionalString(data.website)
  };
};
