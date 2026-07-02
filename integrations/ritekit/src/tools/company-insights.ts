import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
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

    let domain = ctx.input.domain;
    let resolvedDomains: string[] | undefined;

    if (!domain && ctx.input.companyName) {
      let domainResult = await client.companyNameToDomain(ctx.input.companyName);
      resolvedDomains = domainResult.domains || [];
      domain = resolvedDomains[0];
    }

    if (!domain) {
      throw new Error('Either domain or companyName must be provided');
    }

    let includeLogo = ctx.input.includeLogo !== false;
    let includeBrandColors = ctx.input.includeBrandColors !== false;

    let logoUrl: string | undefined;
    let permanentLogoUrl: string | undefined;
    let brandColors: string[] | undefined;

    if (includeLogo) {
      let logoResult = await client.companyLogo(domain);
      logoUrl = logoResult.url;
      permanentLogoUrl = logoResult.permanentUrl;
    }

    if (includeBrandColors) {
      let colorsResult = await client.brandColors(domain);
      brandColors = colorsResult.colors || [];
    }

    let parts: string[] = [`Domain: **${domain}**`];
    if (logoUrl) parts.push(`logo retrieved`);
    if (brandColors && brandColors.length > 0)
      parts.push(`${brandColors.length} brand colors found`);

    return {
      output: {
        domain,
        logoUrl,
        permanentLogoUrl,
        brandColors,
        resolvedDomains
      },
      message: parts.join(', ')
    };
  })
  .build();
