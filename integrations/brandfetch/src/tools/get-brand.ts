import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrandApiClient } from '../lib/client';
import { spec } from '../spec';

let logoFormatSchema = z.object({
  src: z.string().describe('URL to the asset'),
  background: z.string().nullable().describe('Background type, e.g. "transparent"'),
  format: z.string().describe('File format: svg, png, webp, jpeg'),
  height: z.number().optional().describe('Height in pixels'),
  width: z.number().optional().describe('Width in pixels'),
  size: z.number().optional().describe('File size in bytes')
});

let logoSchema = z.object({
  type: z.string().describe('Logo type: icon, logo, or symbol'),
  theme: z.string().nullable().describe('Theme variant: light or dark'),
  formats: z.array(logoFormatSchema).describe('Available formats for this logo'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Descriptive tags, e.g. "photographic", "portrait"')
});

let colorSchema = z.object({
  hex: z.string().describe('Hex color code'),
  type: z.string().describe('Color type, e.g. "accent", "brand", "dark", "light"'),
  brightness: z.number().describe('Brightness value (0-255)')
});

let fontSchema = z.object({
  name: z.string().describe('Font family name'),
  type: z.string().describe('Font type'),
  origin: z.string().nullable().describe('Font origin, e.g. "google"'),
  originId: z.string().nullable().describe('Font origin identifier'),
  weights: z.array(z.number()).describe('Available font weights')
});

let imageSchema = z.object({
  type: z.string().describe('Image type, e.g. "banner"'),
  formats: z.array(logoFormatSchema).describe('Available formats for this image')
});

let linkSchema = z.object({
  name: z.string().describe('Link name, e.g. "twitter", "linkedin"'),
  url: z.string().describe('Link URL')
});

let industrySchema = z.object({
  score: z.number().describe('Industry classification confidence score'),
  name: z.string().describe('Industry name'),
  emoji: z.string().describe('Industry emoji'),
  slug: z.string().describe('Industry slug'),
  parentName: z.string().nullable().describe('Parent industry name'),
  parentSlug: z.string().nullable().describe('Parent industry slug')
});

let companySchema = z
  .object({
    employees: z.number().nullable().describe('Number of employees'),
    foundedYear: z.number().nullable().describe('Year the company was founded'),
    kind: z
      .string()
      .nullable()
      .describe('Company type, e.g. "PRIVATELY_HELD", "PUBLIC_COMPANY"'),
    city: z.string().nullable().describe('City of headquarters'),
    country: z.string().nullable().describe('Country of headquarters'),
    countryCode: z.string().nullable().describe('Country code of headquarters'),
    region: z.string().nullable().describe('Region of headquarters'),
    state: z.string().nullable().describe('State of headquarters'),
    subregion: z.string().nullable().describe('Subregion of headquarters'),
    industries: z.array(industrySchema).describe('Industry classifications')
  })
  .nullable();

export let getBrand = SlateTool.create(spec, {
  name: 'Get Brand',
  key: 'get_brand',
  description: `Retrieve comprehensive brand data for a company, including logos, color palettes, fonts, images, descriptions, and firmographic data.
Supports lookups by domain name, stock/ETF ticker, ISIN, or cryptocurrency symbol.
Use explicit identifier types to prevent collisions when the identifier could match multiple types.`,
  instructions: [
    'Use the identifierType parameter when the identifier could be ambiguous (e.g., a short string that could be a ticker or crypto symbol).',
    'All requests for the domain "brandfetch.com" are free and do not count against usage quotas — useful for testing.'
  ],
  constraints: [
    'Rate limited to 100 requests/second sustained, 30,000 requests per 5-minute window.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe(
          'Brand identifier: domain (e.g. "nike.com"), stock ticker (e.g. "NKE"), ISIN (e.g. "US6541061031"), or crypto symbol (e.g. "BTC")'
        ),
      identifierType: z
        .enum(['domain', 'ticker', 'isin', 'crypto'])
        .optional()
        .describe(
          'Explicit identifier type to prevent collisions. If omitted, auto-detection is used (domain > ticker > ISIN > crypto).'
        )
    })
  )
  .output(
    z.object({
      brandName: z.string().describe('Brand name'),
      domain: z.string().describe('Brand domain'),
      claimed: z.boolean().describe('Whether the brand has been claimed by its owner'),
      description: z.string().nullable().describe('Short brand description'),
      longDescription: z
        .string()
        .nullable()
        .optional()
        .describe('Long brand description for AI applications'),
      qualityScore: z
        .number()
        .describe(
          'Data quality score (0-1). Lower third is poor, middle is OK, upper third is high quality.'
        ),
      isNsfw: z.boolean().describe('Whether the brand contains or relates to adult content'),
      urn: z.string().optional().describe('Brand URN identifier'),
      logos: z
        .array(logoSchema)
        .describe('Brand logos in multiple types, themes, and formats'),
      colors: z.array(colorSchema).describe('Brand color palette'),
      fonts: z.array(fontSchema).describe('Brand fonts'),
      images: z.array(imageSchema).describe('Brand images (banners, etc.)'),
      links: z.array(linkSchema).describe('Brand social/web links'),
      company: companySchema.describe('Company firmographic data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrandApiClient(ctx.auth.token);

    let brand = ctx.input.identifierType
      ? await client.getBrandByType(ctx.input.identifierType, ctx.input.identifier)
      : await client.getBrand(ctx.input.identifier);

    let company = brand.company
      ? {
          employees: brand.company.employees,
          foundedYear: brand.company.foundedYear,
          kind: brand.company.kind,
          city: brand.company.location?.city ?? null,
          country: brand.company.location?.country ?? null,
          countryCode: brand.company.location?.countryCode ?? null,
          region: brand.company.location?.region ?? null,
          state: brand.company.location?.state ?? null,
          subregion: brand.company.location?.subregion ?? null,
          industries: (brand.company.industries || []).map(ind => ({
            score: ind.score,
            name: ind.name,
            emoji: ind.emoji,
            slug: ind.slug,
            parentName: ind.parent?.name ?? null,
            parentSlug: ind.parent?.slug ?? null
          }))
        }
      : null;

    return {
      output: {
        brandName: brand.name,
        domain: brand.domain,
        claimed: brand.claimed,
        description: brand.description,
        longDescription: brand.longDescription,
        qualityScore: brand.qualityScore,
        isNsfw: brand.isNsfw,
        urn: brand.urn,
        logos: brand.logos,
        colors: brand.colors,
        fonts: brand.fonts,
        images: brand.images,
        links: brand.links,
        company
      },
      message: `Retrieved brand data for **${brand.name}** (${brand.domain}). Quality score: ${brand.qualityScore}. Found ${brand.logos.length} logos, ${brand.colors.length} colors, ${brand.fonts.length} fonts, and ${brand.images.length} images.`
    };
  })
  .build();
