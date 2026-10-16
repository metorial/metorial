import { z } from 'zod';
import type { Banner } from './client';

// The same provider file object is returned by generation, polling and file retrieval.
export let bannerOutputSchema = z.object({
  bannerId: z.string().describe('Generated file ID'),
  fileType: z.string().describe('File type'),
  fileUrl: z.string().describe('Provider download URL'),
  cdnUrl: z.string().optional().describe('CDN URL, unavailable for HTML5 ZIP files'),
  filename: z.string().optional().describe('Provider filename when returned'),
  formatName: z.string().optional().describe('Format name; absent on multipage print files'),
  width: z.number().optional().describe('Width in the format unit'),
  height: z.number().optional().describe('Height in the format unit'),
  templateId: z.string().optional().describe('Source design ID when returned'),
  templateName: z.string().optional().describe('Source design name when returned'),
  unit: z.string().optional(),
  version: z.number().optional().describe('Generated file version counter'),
  sharingId: z.string().optional(),
  raw: z.record(z.string(), z.any()).optional().describe('Complete provider metadata')
});

export let mapBanner = (banner: Banner) => ({
  bannerId: banner.id,
  fileType: banner.file.type,
  fileUrl: banner.file.url,
  cdnUrl: banner.file.cdn_url,
  filename: banner.file.filename,
  formatName: banner.format?.id,
  width: banner.format?.width,
  height: banner.format?.height,
  templateId: banner.template?.id,
  templateName: banner.template?.name,
  unit: banner.format?.unit,
  version: banner.version,
  sharingId: banner.sharing_id,
  raw: banner
});
