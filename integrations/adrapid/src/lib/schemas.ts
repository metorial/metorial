import { z } from 'zod';
import type { Banner } from './client';

export let bannerSchema = z.object({
  bannerId: z.string().describe('Unique identifier of the banner'),
  status: z.string().describe('Current status reported by Adrapid'),
  templateId: z.string().optional().describe('Editable template ID, when returned by Adrapid'),
  files: z
    .array(
      z.object({
        fileId: z.string().optional().describe('File identifier, when returned by Adrapid'),
        url: z
          .string()
          .optional()
          .describe('Direct URL to download or preview the banner file'),
        status: z
          .string()
          .optional()
          .describe('File processing status, when returned by Adrapid'),
        name: z.string().optional().describe('File name'),
        type: z
          .string()
          .optional()
          .describe('Provider file category, such as image, video, or html5'),
        size: z.number().optional().describe('File size, when returned by Adrapid'),
        width: z.number().optional().describe('Banner width in pixels'),
        height: z.number().optional().describe('Banner height in pixels'),
        raw: z
          .record(z.string(), z.any())
          .describe('Complete provider file metadata, including component files')
      })
    )
    .describe('Generated files; empty while an asynchronous export has no files'),
  createdAt: z.string().optional().describe('Creation timestamp, when returned by Adrapid'),
  updatedAt: z.string().optional().describe('Update timestamp, when returned by Adrapid'),
  raw: z.record(z.string(), z.any()).describe('Complete provider banner response')
});

export let getBannerOutput = (banner: Banner) => ({
  bannerId: banner.bannerId,
  status: banner.status,
  templateId: banner.templateId,
  files: banner.files.map(({ id, ...file }) => ({ fileId: id, ...file })),
  createdAt: banner.createdAt,
  updatedAt: banner.updatedAt,
  raw: banner.raw
});
