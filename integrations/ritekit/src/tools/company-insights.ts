import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { deliverImageDownload } from '../lib/images';
import { spec } from '../spec';

export let companyInsights = SlateTool.create(spec, {
  name: 'Company Insights',
  key: 'company_insights',
  description: `Retrieves company information including logo URL, brand colors, and domain resolution from a company name or domain.
Provide either a domain or a company name to get the company's logo and brand colors. If a company name is provided, the domain is resolved first.
Use this for CRM enrichment, auto-generating company profiles, or customizing UI with brand assets.`,
  instructions: [
    'If you have a company name but not a domain, the tool will automatically resolve the domain first.',
    'Initial logo extraction for new domains may take 30-60 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      generateFallbackLogo: z
        .boolean()
        .optional()
        .describe('Generate a fallback logo when no company logo is found'),
      squareLogoSize: z
        .number()
        .int()
        .min(0)
        .max(512)
        .optional()
        .describe('Square logo size in pixels; 0 keeps the original size'),
      squareLogoBackground: z
        .enum(['original', 'remove', 'add'])
        .optional()
        .describe('Keep, remove, or add a solid background to the square logo'),
      domain: z
        .string()
        .optional()
        .describe('Website domain of the company (e.g., "google.com")'),
      companyName: z
        .string()
        .optional()
        .describe('Company name to look up (the domain will be resolved automatically)'),
      includeLogo: z
        .boolean()
        .optional()
        .describe('Whether to fetch the company logo (default: true)'),
      includeBrandColors: z
        .boolean()
        .optional()
        .describe('Whether to fetch brand colors (default: true)')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider responses for each requested operation'),
      originalLogo: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original-aspect logo URLs in the available formats'),
      squareLogo: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Square logo size, background, and available format URLs'),
      isGenerated: z
        .boolean()
        .optional()
        .describe('Whether RiteKit generated a fallback logo'),
      downloadError: z
        .string()
        .optional()
        .describe('Reason the downloadable logo could not be prepared'),
      domain: z.string().optional().describe('Resolved website domain'),
      logoUrl: z.string().optional().describe('URL of the company logo'),
      permanentLogoUrl: z
        .string()
        .optional()
        .describe('Persistent hosted URL for the company logo'),
      brandColors: z
        .array(z.string())
        .optional()
        .describe('Array of brand color hex codes used on the company website'),
      resolvedDomains: z
        .array(z.string())
        .optional()
        .describe('List of probable domains if resolved from company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });

    let raw: Record<string, unknown> = {};
    let domain = ctx.input.domain;
    let resolvedDomains: string[] | undefined;

    if (!domain && ctx.input.companyName) {
      let domainResult = await client.companyNameToDomain(ctx.input.companyName);
      raw.domains = domainResult;
      resolvedDomains = domainResult.domains || [];
      domain = resolvedDomains[0];
    }

    if (!domain) {
      throw createApiServiceError(
        'Either domain or companyName must be provided and resolve to a domain'
      );
    }

    let includeLogo = ctx.input.includeLogo !== false;
    let includeBrandColors = ctx.input.includeBrandColors !== false;

    let logoUrl: string | undefined;
    let permanentLogoUrl: string | undefined;
    let brandColors: string[] | undefined;
    let originalLogo: Record<string, unknown> | undefined;
    let squareLogo: Record<string, unknown> | undefined;
    let isGenerated: boolean | undefined;
    let downloadError: string | undefined;

    if (includeLogo) {
      let logoResult = await client.companyLogo(domain, {
        generateFallbackLogo:
          ctx.input.generateFallbackLogo === undefined
            ? undefined
            : ctx.input.generateFallbackLogo
              ? 1
              : 0,
        squareLogoSize: ctx.input.squareLogoSize,
        squareLogoBackground: ctx.input.squareLogoBackground
      });
      raw.logo = logoResult;
      originalLogo = logoResult.originalLogo;
      squareLogo = logoResult.squareLogo;
      isGenerated = logoResult.isGenerated;
      downloadError = await deliverImageDownload(logoResult.url, content =>
        ctx.addAttachment({ type: 'content', content })
      );
      logoUrl = logoResult.url;
      permanentLogoUrl = logoResult.permanentUrl;
    }

    if (includeBrandColors) {
      let colorsResult = await client.brandColors(domain);
      raw.colors = colorsResult;
      brandColors = colorsResult.data ?? colorsResult.colors ?? [];
    }

    let parts: string[] = [`Domain: **${domain}**`];
    if (logoUrl) parts.push(`logo retrieved`);
    if (brandColors && brandColors.length > 0)
      parts.push(`${brandColors.length} brand colors found`);

    return {
      output: {
        raw,
        originalLogo,
        squareLogo,
        isGenerated,
        downloadError,
        domain,
        logoUrl,
        permanentLogoUrl,
        brandColors,
        resolvedDomains
      },
      message: `${parts.join(', ')}${downloadError ? `. ${downloadError}` : ''}`
    };
  })
  .build();
