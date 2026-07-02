import { createAxios } from 'slates';

export interface OEmbedResponse {
  type: string;
  version: string;
  title: string;
  html: string;
  width: number | null;
  height: number | null;
  providerName: string;
  providerUrl: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  duration: number;
}

export interface OEmbedOptions {
  maxWidth?: number;
  maxHeight?: number;
}

export let extractVideoId = (url: string): string | null => {
  let shareMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (shareMatch?.[1]) return shareMatch[1];

  let embedMatch = url.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
  if (embedMatch?.[1]) return embedMatch[1];

  return null;
};

export let isValidLoomUrl = (url: string): boolean => {
  return /https?:\/\/(www\.)?loom\.com\/(share|embed)\/[a-zA-Z0-9]+/.test(url);
};

export let normalizeToShareUrl = (url: string): string => {
  let videoId = extractVideoId(url);
  if (!videoId) return url;
  return `https://www.loom.com/share/${videoId}`;
};

export let fetchOEmbed = async (
  loomUrl: string,
  options?: OEmbedOptions
): Promise<OEmbedResponse> => {
  let http = createAxios({ baseURL: 'https://www.loom.com' });
  let shareUrl = normalizeToShareUrl(loomUrl);

  let params: Record<string, string> = { url: shareUrl };
  if (options?.maxWidth) params.maxwidth = String(options.maxWidth);
  if (options?.maxHeight) params.maxheight = String(options.maxHeight);

  let response = await http.get('/v1/oembed', { params });
  let data = response.data;

  return {
    type: data.type,
    version: data.version,
    title: data.title,
    html: data.html,
    width: data.width ?? null,
    height: data.height ?? null,
    providerName: data.provider_name,
    providerUrl: data.provider_url,
    thumbnailUrl: data.thumbnail_url,
    thumbnailWidth: data.thumbnail_width,
    thumbnailHeight: data.thumbnail_height,
    duration: data.duration
  };
};

export let buildEmbedUrl = (
  videoId: string,
  options?: {
    hideTopBar?: boolean;
    autoplay?: boolean;
    startTime?: string;
  }
): string => {
  let url = `https://www.loom.com/embed/${videoId}`;
  let params: string[] = [];

  if (options?.hideTopBar) params.push('hideEmbedTopBar=true');
  if (options?.autoplay) params.push('autoplay=1');
  if (options?.startTime) params.push(`t=${options.startTime}`);

  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  return url;
};

export let buildEmbedIframe = (
  videoId: string,
  options?: {
    width?: number;
    height?: number;
    hideTopBar?: boolean;
    autoplay?: boolean;
    startTime?: string;
  }
): string => {
  let embedUrl = buildEmbedUrl(videoId, options);

  if (!options?.width && !options?.height) {
    let style = `position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;`;
    return `<div style="${style}"><iframe src="${embedUrl}" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
  }

  let widthAttr = options?.width ? ` width="${options.width}"` : '';
  let heightAttr = options?.height ? ` height="${options.height}"` : '';

  return `<iframe src="${embedUrl}"${widthAttr}${heightAttr} frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`;
};

export let findLoomUrls = (text: string): string[] => {
  let regex = /https?:\/\/(www\.)?loom\.com\/(share|embed)\/[a-zA-Z0-9]+/g;
  let matches = text.match(regex);
  return matches ?? [];
};
