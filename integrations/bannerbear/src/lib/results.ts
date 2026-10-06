import type { ResourceType } from './client';
import {
  address,
  incomplete,
  nativeState,
  nativeStrings,
  nonempty,
  nullableNumber,
  nullableText,
  numeric,
  optionalText,
  type Row,
  row,
  rows,
  text,
  uid
} from './contracts';

export const imageOutput = (value: Row) => ({
  imageUid: uid(value.uid),
  status: nativeState(value.status),
  imageUrl: nullableText(value.image_url),
  imageUrlPng: nullableText(value.image_url_png),
  pdfUrl: nullableText(value.pdf_url),
  templateUid: uid(value.template),
  createdAt: nonempty(value.created_at)
});
export const videoOutput = (value: Row) => ({
  videoUid: uid(value.uid),
  status: nativeState(value.status),
  videoUrl: nullableText(value.video_url),
  percentRendered: nullableNumber(value.percent_rendered, 0, 100),
  lengthInSeconds: nullableNumber(value.length_in_seconds),
  createdAt: nonempty(value.created_at)
});
export const gifOutput = (value: Row) => ({
  gifUid: uid(value.uid),
  status: nativeState(value.status),
  imageUrl: nullableText(value.image_url),
  createdAt: nonempty(value.created_at)
});
export const movieOutput = (value: Row) => ({
  movieUid: uid(value.uid),
  status: nativeState(value.status),
  videoUrl: nullableText(value.movie_url),
  percentRendered: nullableNumber(value.percent_rendered, 0, 100),
  totalLengthInSeconds: nullableNumber(value.total_length_in_seconds),
  createdAt: nonempty(value.created_at)
});
export const screenshotOutput = (value: Row) => ({
  screenshotUid: uid(value.uid),
  status: nativeState(value.status),
  screenshotImageUrl: nullableText(value.screenshot_image_url),
  createdAt: nonempty(value.created_at)
});
export const collectionOutput = (value: Row) => ({
  collectionUid: uid(value.uid),
  status: nativeState(value.status),
  imageUrls:
    value.image_urls === undefined || value.image_urls === null
      ? null
      : Object.fromEntries(
          Object.entries(row(value.image_urls)).map(([key, url]) => [key, nonempty(url)])
        ),
  images:
    value.images === undefined || value.images === null
      ? null
      : rows(value.images).map(item => ({
          imageUid: uid(item.uid),
          templateUid: uid(item.template),
          imageUrl: nullableText(item.image_url),
          status: nativeState(item.status)
        })),
  createdAt: nonempty(value.created_at)
});
export const templateOutput = (value: Row) => ({
  templateUid: uid(value.uid),
  name: text(value.name),
  width: numeric(value.width, 1),
  height: numeric(value.height, 1),
  previewUrl: nullableText(value.preview_url),
  tags: nativeStrings(value.tags)
});
export const diagnosisOutput = (value: Row) => ({
  diagnosisUid: uid(value.uid),
  status: nativeState(value.status),
  report:
    value.report === undefined || value.report === null
      ? null
      : rows(row(value.report).external_images).map(item => ({
          url: optionalText(item.image_url),
          result: optionalText(item.result),
          comment: optionalText(item.comment)
        }))
});
export type GeneratedType =
  | 'image'
  | 'video'
  | 'collection'
  | 'animated_gif'
  | 'movie'
  | 'screenshot'
  | 'joined_pdf'
  | 'rasterized_pdf';
export type DownloadFormat = 'all' | 'jpg' | 'png' | 'pdf' | 'gif' | 'mp4';
export type DeliveredFile = { url: string; filename: string; mimeType: string };
const extensions = {
  jpg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  gif: 'image/gif',
  mp4: 'video/mp4'
} as const;
export const generatedFiles = (
  type: ResourceType,
  value: Row,
  format: DownloadFormat = 'all'
): DeliveredFile[] => {
  if (
    ![
      'image',
      'video',
      'collection',
      'animated_gif',
      'movie',
      'screenshot',
      'joined_pdf',
      'rasterized_pdf'
    ].includes(type)
  )
    return [];
  if (nativeState(value.status) !== 'completed') return [];
  const id = uid(value.uid);
  const files: DeliveredFile[] = [];
  const seen = new Set<string>();
  const add = (url: unknown, extension: keyof typeof extensions, suffix = '') => {
    if (url === undefined || url === null) return;
    const target = address(nonempty(url), true);
    if ((format !== 'all' && format !== extension) || seen.has(target)) return;
    seen.add(target);
    files.push({
      url: target,
      filename: `${id}${suffix}.${extension}`,
      mimeType: extensions[extension]
    });
  };
  const image = (item: Row, suffix = '') => {
    const primary = nullableText(item.image_url);
    const ext =
      primary && new URL(address(primary, true)).pathname.toLowerCase().endsWith('.png')
        ? 'png'
        : 'jpg';
    add(primary, ext, suffix);
    add(item.image_url_png, 'png', suffix);
    add(item.pdf_url, 'pdf', suffix);
  };
  if (type === 'image') image(value);
  if (type === 'video') {
    add(value.video_url, 'mp4');
    add(value.gif_preview_url, 'gif', '-preview');
  }
  if (type === 'animated_gif') add(value.image_url, 'gif');
  if (type === 'movie') add(value.movie_url, 'mp4');
  if (type === 'screenshot') {
    const source = nullableText(value.screenshot_image_url);
    add(
      source,
      source && new URL(address(source, true)).pathname.toLowerCase().endsWith('.png')
        ? 'png'
        : 'jpg'
    );
  }
  if (type === 'joined_pdf') add(value.joined_pdf_url, 'pdf');
  if (type === 'rasterized_pdf') {
    add(value.image_url_png, 'png');
    add(value.image_url_jpg, 'jpg');
  }
  if (type === 'collection') {
    for (const item of rows(value.images)) {
      if (nativeState(item.status) !== 'completed') incomplete();
      image(item, `-${uid(item.uid)}`);
    }
  }
  if (format === 'all' && !files.length) incomplete();
  return files;
};
export type FileContext = {
  addAttachment(input: {
    type: 'url';
    url: string;
    filename: string;
    mimeType: string;
  }): Promise<unknown>;
};
export const deliverGeneratedFiles = async (
  ctx: FileContext,
  type: ResourceType,
  value: Row,
  format: DownloadFormat = 'all'
) => {
  const files = generatedFiles(type, value, format);
  for (const file of files) await ctx.addAttachment({ type: 'url', ...file });
  return files;
};
