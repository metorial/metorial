import { z } from 'zod';

export let scrapingOptionsSchema = {
  js: z
    .boolean()
    .optional()
    .describe('Enable JavaScript rendering via headless Chromium. Defaults to true.'),
  jsTimeout: z
    .number()
    .optional()
    .describe('JavaScript execution wait time in milliseconds (1-20000). Defaults to 2000.'),
  timeout: z
    .number()
    .optional()
    .describe('Total request timeout in milliseconds (1-30000). Defaults to 10000.'),
  waitFor: z
    .string()
    .optional()
    .describe('CSS selector to wait for before returning the page content.'),
  proxy: z
    .enum(['datacenter', 'residential'])
    .optional()
    .describe(
      'Proxy type. Datacenter is faster (1 credit), residential handles anti-bot sites (5 credits). Defaults to datacenter.'
    ),
  country: z
    .string()
    .optional()
    .describe(
      'Proxy country code, e.g. "us", "gb", "de", "fr", "es", "it", "ca", "ru", "jp", "kr", "in". Defaults to "us".'
    ),
  device: z
    .enum(['desktop', 'mobile', 'tablet'])
    .optional()
    .describe(
      'Device emulation: desktop (1920x1080), mobile (375x812), tablet (768x1024). Defaults to desktop.'
    ),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Custom HTTP headers as key-value pairs. Supports Cookie, Authorization, Referer, etc.'
    ),
  jsScript: z
    .string()
    .optional()
    .describe('Custom JavaScript code to execute on the page after it loads.'),
  customProxy: z
    .string()
    .optional()
    .describe('Custom proxy URL in format http://user:pass@host:port.'),
  errorOn404: z
    .boolean()
    .optional()
    .describe('Return error for 404 pages instead of page content. Defaults to false.'),
  errorOnRedirect: z
    .boolean()
    .optional()
    .describe('Return error on redirects instead of following them. Defaults to false.')
};
