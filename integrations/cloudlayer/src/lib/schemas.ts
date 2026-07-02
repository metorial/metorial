import { z } from 'zod';

export let marginSchema = z
  .object({
    top: z.string().optional().describe('Top margin (CSS units, e.g. "10mm", "0.5in")'),
    bottom: z.string().optional().describe('Bottom margin (CSS units, e.g. "10mm", "0.5in")'),
    left: z.string().optional().describe('Left margin (CSS units, e.g. "10mm", "0.5in")'),
    right: z.string().optional().describe('Right margin (CSS units, e.g. "10mm", "0.5in")')
  })
  .optional()
  .describe('Page margins');

export let viewPortSchema = z
  .object({
    width: z.number().optional().describe('Viewport width in pixels'),
    height: z.number().optional().describe('Viewport height in pixels'),
    deviceScaleFactor: z.number().optional().describe('Device scale factor (DPR)')
  })
  .optional()
  .describe('Browser viewport configuration');

export let waitForSelectorSchema = z
  .object({
    selector: z.string().describe('CSS selector to wait for'),
    timeout: z.number().optional().describe('Maximum wait time in milliseconds')
  })
  .optional()
  .describe('Wait for a CSS selector to appear before generating');

export let headerFooterTemplateSchema = z
  .object({
    selector: z.string().optional().describe('CSS selector for the template element'),
    method: z.string().optional().describe('Template method type'),
    style: z.string().optional().describe('CSS styles for the template'),
    imageStyle: z.string().optional().describe('CSS styles for images in the template')
  })
  .optional();

export let generatePreviewSchema = z
  .object({
    width: z.number().optional().describe('Preview width in pixels'),
    height: z.number().optional().describe('Preview height in pixels'),
    imageType: z.string().optional().describe('Preview image type (e.g. "webp", "png")'),
    quality: z.number().optional().describe('Preview quality (0-100)')
  })
  .optional()
  .describe('Generate a thumbnail preview of the first page');

export let cookieSchema = z.object({
  name: z.string().describe('Cookie name'),
  value: z.string().describe('Cookie value'),
  domain: z.string().optional().describe('Cookie domain'),
  path: z.string().optional().describe('URL path (default "/")'),
  expires: z.number().optional().describe('Unix timestamp for expiration'),
  httpOnly: z.boolean().optional().describe('HTTP-only flag'),
  secure: z.boolean().optional().describe('Secure flag (HTTPS only)'),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional().describe('SameSite attribute')
});

export let authenticationSchema = z
  .object({
    username: z.string().describe('Username for Basic Auth'),
    password: z.string().describe('Password for Basic Auth')
  })
  .optional()
  .describe('HTTP Basic Authentication credentials');

export let waitUntilSchema = z
  .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
  .optional()
  .describe('Page load completion strategy');

export let paperFormatSchema = z
  .enum(['letter', 'legal', 'tabloid', 'ledger', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6'])
  .optional()
  .describe('Paper format');

export let imageTypeSchema = z
  .enum(['png', 'jpg', 'webp'])
  .optional()
  .describe('Output image format');

export let baseOptionsSchema = z.object({
  delay: z
    .number()
    .optional()
    .describe('Wait time in milliseconds after page loads before generating'),
  timeout: z
    .number()
    .optional()
    .describe('Maximum page load time in milliseconds (default 30000)'),
  waitUntil: waitUntilSchema,
  waitForSelector: waitForSelectorSchema,
  autoScroll: z
    .boolean()
    .optional()
    .describe('Scroll page to bottom before generating to trigger lazy-loaded content'),
  timeZone: z
    .string()
    .optional()
    .describe('Browser timezone using IANA name (e.g. "America/New_York")'),
  viewPort: viewPortSchema,
  scale: z.number().optional().describe('Page rendering scale (0.1 to 2)'),
  filename: z.string().optional().describe('Output filename'),
  projectId: z.string().optional().describe('Project ID for dashboard organization'),
  landscape: z.boolean().optional().describe('Generate in landscape orientation'),
  width: z
    .string()
    .optional()
    .describe('Override width using CSS units (e.g. "8.5in", "210mm")'),
  height: z
    .string()
    .optional()
    .describe('Override height using CSS units (e.g. "11in", "297mm")')
});

export let pdfOptionsSchema = baseOptionsSchema.extend({
  format: paperFormatSchema,
  margin: marginSchema,
  pageRanges: z
    .string()
    .optional()
    .describe('Page ranges to print (e.g. "1-5", "8", "1-3, 5")'),
  printBackground: z
    .boolean()
    .optional()
    .describe('Include background graphics (default true)'),
  preferCSSPageSize: z
    .boolean()
    .optional()
    .describe('Use CSS @page size instead of format parameter'),
  headerTemplate: headerFooterTemplateSchema.describe('Custom page header template'),
  footerTemplate: headerFooterTemplateSchema.describe('Custom page footer template'),
  generatePreview: generatePreviewSchema
});

export let imageOptionsSchema = baseOptionsSchema.extend({
  imageType: imageTypeSchema,
  transparent: z
    .boolean()
    .optional()
    .describe('Render with transparent background (PNG/WebP only)'),
  trim: z.boolean().optional().describe('Trim whitespace from image edges')
});

export let jobResponseSchema = z.object({
  jobId: z.string().describe('Unique job identifier'),
  status: z.string().describe('Job status (pending, processing, completed, failed)'),
  assetUrl: z.string().optional().describe('URL to the generated asset (when completed)'),
  previewUrl: z
    .string()
    .optional()
    .describe('URL to the preview image (if preview was requested)'),
  timestamp: z.string().optional().describe('ISO 8601 timestamp')
});

export let assetSchema = z.object({
  assetId: z.string().describe('Unique asset identifier'),
  jobId: z.string().optional().describe('Associated job ID'),
  ext: z.string().optional().describe('File extension (pdf, png, jpg, webp)'),
  type: z.string().optional().describe('MIME type'),
  size: z.number().optional().describe('File size in bytes'),
  url: z.string().optional().describe('Direct download URL'),
  timestamp: z.string().optional().describe('ISO 8601 creation timestamp')
});
