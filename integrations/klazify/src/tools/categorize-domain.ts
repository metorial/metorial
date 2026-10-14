import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { categorySchema } from '../lib/schemas';
import { spec } from '../spec';

export let categorizeDomain = SlateTool.create(spec, {
  name: 'Categorize Domain',
  key: 'categorize_domain',
  description: `Classifies a website, domain, URL, or IP address into content categories using machine learning. Returns up to three categories with confidence scores, plus optional logo URL, social media links, company data, domain registration info, and similar domains. Supports categorizing mobile apps via App Store or Google Play URLs.`,
  instructions: [
    'Provide a full URL including the protocol (e.g., https://example.com).',
    'You can also pass an email address to look up the domain associated with it.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'The URL, domain, IP address, or email to categorize (e.g., https://example.com)'
        )
    })
  )
  .output(
    z.object({
      categories: z
        .array(categorySchema)
        .describe('Assigned content categories with confidence scores'),
      logoUrl: z.string().nullable().optional().describe('URL to the domain logo image'),
      socialMedia: z
        .record(z.string(), z.string().nullable())
        .nullable()
        .optional()
        .describe('Social media profile URLs keyed by platform'),
      company: z
        .object({
          name: z.string().nullable().optional(),
          city: z.string().nullable().optional(),
          stateCode: z.string().nullable().optional(),
          countryCode: z.string().nullable().optional(),
          employeesRange: z.string().nullable().optional(),
          revenue: z
            .number()
            .nullable()
            .optional()
            .describe(
              'Numeric revenue when supplied by the provider; otherwise null. See revenueRange for textual estimates.'
            ),
          revenueRange: z
            .string()
            .nullable()
            .optional()
            .describe(
              'Exact estimated annual revenue range supplied by the provider, such as "$1M-$10M"'
            ),
          raised: z.string().nullable().optional(),
          tags: z.array(z.string()).nullable().optional(),
          tech: z.array(z.string()).nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Company profile data'),
      domainRegistration: z
        .object({
          domainAgeDate: z.string().nullable().optional().describe('Domain registration date'),
          domainAgeDaysAgo: z
            .string()
            .nullable()
            .optional()
            .describe('Number of days since domain registration'),
          domainExpirationDate: z
            .string()
            .nullable()
            .optional()
            .describe('Domain expiration date'),
          domainExpirationDaysLeft: z
            .string()
            .nullable()
            .optional()
            .describe('Days until domain expiration')
        })
        .nullable()
        .optional()
        .describe('Domain registration data'),
      similarDomains: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('List of similar or competitor domain names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.categorize(ctx.input.url);

    let domain = result.domain ?? {};
    let objects = result.objects ?? {};
    let company = objects.company ?? null;
    let registration = result.domain_registration_data ?? null;

    let output = {
      categories: domain.categories ?? [],
      logoUrl: domain.logo_url ?? null,
      socialMedia: domain.social_media ?? null,
      company: company
        ? {
            name: company.name ?? null,
            city: company.city ?? null,
            stateCode: company.stateCode ?? null,
            countryCode: company.countryCode ?? null,
            employeesRange: company.employeesRange ?? null,
            revenue: typeof company.revenue === 'number' ? company.revenue : null,
            revenueRange: typeof company.revenue === 'string' ? company.revenue : null,
            raised: company.raised ?? null,
            tags: company.tags ?? null,
            tech: company.tech ?? null
          }
        : null,
      domainRegistration: registration
        ? {
            domainAgeDate: registration.domain_age_date ?? null,
            domainAgeDaysAgo:
              registration.domain_age_days_ago == null
                ? null
                : String(registration.domain_age_days_ago),
            domainExpirationDate: registration.domain_expiration_date ?? null,
            domainExpirationDaysLeft:
              registration.domain_expiration_days_left == null
                ? null
                : String(registration.domain_expiration_days_left)
          }
        : null,
      similarDomains:
        result.similar_domains ?? result.similar ?? domain.similar_domains ?? null
    };

    let categoryNames = output.categories.map((c: { name: string }) => c.name).join(', ');
    return {
      output,
      message: `Categorized **${ctx.input.url}**: ${categoryNames || 'No categories found'}.`
    };
  })
  .build();
