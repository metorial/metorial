import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';
import { brandProfileSchema, mapBrandProfile } from '../lib/brand';
import { ContextClient } from '../lib/client';
import { cacheMetadataSchema, responseMetadata } from '../lib/response';
import { contextTool } from '../lib/tools';

const colorSchema = z
  .object({ hex: z.string().optional(), name: z.string().optional() })
  .passthrough();
const brandResponseSchema = z
  .object({
    status: z.string(),
    code: z.number().int(),
    partial: z.boolean().optional(),
    brand: z
      .object({
        domain: z.string().optional(),
        title: z.string().optional(),
        slogan: z.string().nullish(),
        description: z.string().nullish(),
        colors: z.array(colorSchema).optional(),
        logos: z
          .array(
            z
              .object({
                url: z.string().optional(),
                type: z.string().optional(),
                mode: z.string().optional(),
                colors: z.array(colorSchema).optional()
              })
              .passthrough()
          )
          .optional(),
        socials: z
          .array(
            z.object({ type: z.string().optional(), url: z.string().optional() }).passthrough()
          )
          .optional(),
        address: z
          .object({
            city: z.string().optional(),
            country: z.string().optional(),
            state_province: z.string().optional()
          })
          .passthrough()
          .nullish(),
        stock: z
          .object({ ticker: z.string().optional(), exchange: z.string().optional() })
          .passthrough()
          .nullish(),
        industries: z
          .object({
            eic: z
              .array(z.object({ industry: z.string(), subindustry: z.string() }).passthrough())
              .optional()
          })
          .passthrough()
          .nullish(),
        links: z.record(z.string(), z.string().nullable()).nullish(),
        email: z.string().nullish(),
        phone: z.string().nullish()
      })
      .passthrough(),
    cache_metadata: cacheMetadataSchema,
    ...responseMetadata
  })
  .passthrough();

const retrieveBrand = contextTool('brand-retrieve-unified', {
  description:
    'Retrieve structured company and brand intelligence, including logos, colors, descriptions, social profiles, industry, location, and links. Identify the company by domain, company name, work email, stock ticker, transaction descriptor, or a direct URL. Use get-brand for a compact profile from a domain.'
})
  .output(brandResponseSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof brandResponseSchema>
    >('retrieve brand intelligence', {
      method: 'POST',
      path: '/brand/retrieve',
      body: ctx.input.body
    });
    return {
      output,
      message: `Retrieved brand intelligence${output.brand.domain ? ` for ${output.brand.domain}` : ''}.`
    };
  })
  .build();

const getBrand = contextTool('get-brand', {
  description:
    'Retrieve a structured brand profile for a domain, including its logo, colors, slogan, description, social profiles, industry, location, and key links. Use brand-retrieve-unified for more detailed data or lookup by company name, work email, stock ticker, transaction descriptor, or direct URL.'
})
  .output(brandProfileSchema)
  .handleInvocation(async ctx => {
    const response = await new ContextClient(ctx.auth.token).request(
      'retrieve brand profile',
      {
        method: 'POST',
        path: '/brand/retrieve',
        body: pickDefined({
          type: 'by_domain',
          domain: ctx.input.domain,
          maxSpeed: ctx.input.maxSpeed
        })
      }
    );
    const output = mapBrandProfile(response, ctx.input.domain);
    return { output, message: `Retrieved the brand profile for ${output.brand.domain}.` };
  })
  .build();

const brandSearchSchema = z
  .object({
    results: z.array(
      z.object({ domain: z.string(), name: z.string(), logo: z.string() }).passthrough()
    ),
    ...responseMetadata
  })
  .passthrough();

const searchBrands = contextTool('brand-search', {
  description:
    'Search indexed brands by company name or domain and return up to 10 lightweight matches. Supports prefix autocomplete, field selection, and typo tolerance. Use brand-retrieve-unified for a full profile or get-brand for a compact domain profile.'
})
  .output(brandSearchSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof brandSearchSchema>
    >('search brands', { method: 'GET', path: '/brand/search', query: ctx.input });
    return { output, message: `Found ${output.results.length} matching brands.` };
  })
  .build();

const typographySchema = z
  .object({
    fontFamily: z.string(),
    fontFallbacks: z.array(z.string()),
    fontSize: z.string(),
    fontWeight: z.number(),
    lineHeight: z.string(),
    letterSpacing: z.string()
  })
  .passthrough();
const styleguideSchema = z
  .object({
    domain: z.string().optional(),
    status: z.string().optional(),
    code: z.number().int().optional(),
    finalDOMState: z.enum(['loaded', 'still-loading']).optional(),
    styleguide: z
      .object({
        mode: z.enum(['light', 'dark']),
        colors: z
          .object({ accent: z.string(), background: z.string(), text: z.string() })
          .passthrough(),
        typography: z
          .object({
            headings: z
              .object({
                h1: typographySchema.optional(),
                h2: typographySchema.optional(),
                h3: typographySchema.optional(),
                h4: typographySchema.optional()
              })
              .passthrough(),
            p: typographySchema.optional()
          })
          .passthrough(),
        elementSpacing: z
          .object({
            xs: z.string(),
            sm: z.string(),
            md: z.string(),
            lg: z.string(),
            xl: z.string()
          })
          .passthrough(),
        shadows: z
          .object({
            sm: z.string(),
            md: z.string(),
            lg: z.string(),
            xl: z.string(),
            inner: z.string()
          })
          .passthrough(),
        fontLinks: z.record(
          z.string(),
          z
            .object({
              type: z.enum(['google', 'custom']),
              files: z.record(z.string(), z.string()),
              category: z.string().optional(),
              displayName: z.string().optional()
            })
            .passthrough()
        ),
        components: z
          .object({
            button: z
              .object({
                primary: z.record(z.string(), z.unknown()).optional(),
                secondary: z.record(z.string(), z.unknown()).optional(),
                link: z.record(z.string(), z.unknown()).optional()
              })
              .passthrough(),
            card: z.record(z.string(), z.unknown()).optional()
          })
          .passthrough()
      })
      .passthrough()
      .optional(),
    cache_metadata: cacheMetadataSchema,
    ...responseMetadata
  })
  .passthrough();

const extractStyleguide = contextTool('web-styleguide')
  .output(styleguideSchema)
  .handleInvocation(async ctx => {
    if ((ctx.input.domain !== undefined) === (ctx.input.directUrl !== undefined)) {
      throw createApiServiceError('Provide exactly one of domain or directUrl.');
    }
    if (
      ctx.input.timeoutOpts?.behavior === 'return-partial' &&
      ctx.input.timeoutOpts.milliseconds < 5000
    ) {
      throw createApiServiceError(
        'A return-partial style guide request requires timeoutOpts.milliseconds of at least 5000.'
      );
    }
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof styleguideSchema>
    >('extract website style guide', {
      method: 'GET',
      path: '/web/styleguide',
      query: ctx.input
    });
    return {
      output,
      message: `Retrieved the website style guide${output.domain ? ` for ${output.domain}` : ''}.`
    };
  })
  .build();

const roleSchema = z
  .object({
    title: z.string(),
    organization: z.object({ name: z.string(), domain: z.string().optional() }).passthrough(),
    location: z.string().optional(),
    description: z.string().optional(),
    is_current: z.boolean().optional()
  })
  .passthrough();
const personSchema = z
  .object({
    name: z
      .object({
        full: z.string().optional(),
        first: z.string().optional(),
        last: z.string().optional()
      })
      .passthrough()
      .optional(),
    email: z.string().optional(),
    avatar_url: z.string().optional(),
    bio: z.string().optional(),
    location: z
      .object({
        display: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        country_code: z.string().optional()
      })
      .passthrough()
      .optional(),
    social_urls: z.array(z.string()),
    website_urls: z.array(z.string()),
    current_role_status: z.enum(['present', 'none', 'unknown']),
    current_role: roleSchema.optional(),
    experience: z.array(roleSchema),
    education: z.array(
      z
        .object({
          institution: z
            .object({ name: z.string(), domain: z.string().optional() })
            .passthrough(),
          degree: z.string().optional(),
          field_of_study: z.string().optional()
        })
        .passthrough()
    ),
    skills: z.array(z.string()),
    last_updated: z.string().optional(),
    checked_at: z.string().optional()
  })
  .passthrough();
const peopleEnrichmentSchema = z
  .object({
    partial: z.boolean().optional(),
    match: z
      .object({
        status: z.enum(['candidate', 'not_found']),
        score: z.number().int().nullable(),
        person: personSchema.nullable()
      })
      .passthrough(),
    ...responseMetadata
  })
  .passthrough();

const enrichPerson = contextTool('people-enrich')
  .output(peopleEnrichmentSchema)
  .handleInvocation(async ctx => {
    const input = ctx.input;
    if (input.company && !input.company.name && !input.company.domain) {
      throw createApiServiceError(
        'Provide company.name or company.domain when supplying company context.'
      );
    }
    if (
      input.location &&
      !input.location.city &&
      !input.location.region &&
      !input.location.country
    ) {
      throw createApiServiceError(
        'Provide a city, region, or country when supplying location context.'
      );
    }
    for (const education of input.education ?? []) {
      if (
        education.institution &&
        !education.institution.name &&
        !education.institution.domain
      ) {
        throw createApiServiceError(
          'Provide institution.name or institution.domain for each education institution.'
        );
      }
      if (!Object.keys(education).length) {
        throw createApiServiceError(
          'Education entries must include an institution, degree, field_of_study, or graduation_year.'
        );
      }
    }
    if (
      !input.email &&
      !input.social_urls?.length &&
      !(
        input.name?.first &&
        input.name?.last &&
        (input.company || input.education?.length || input.location)
      )
    ) {
      throw createApiServiceError(
        'Provide an email, a person-profile social URL, or both first and last name with company, education, or location context.'
      );
    }
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof peopleEnrichmentSchema>
    >('enrich person', { method: 'POST', path: '/people/enrich', body: input });
    return {
      output,
      message:
        output.match.status === 'candidate'
          ? `Found a person candidate with match score ${output.match.score}.`
          : 'No usable person candidate was found.'
    };
  })
  .build();

const newsSchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string(),
          story_id: z.string(),
          url: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          language: z.string().nullable(),
          authors: z.array(z.string()),
          image_url: z.string().nullable(),
          published_at: z.string().nullable(),
          type: z.enum(['editorial', 'press_release', 'regulatory_filing', 'advisory']),
          source: z
            .object({ name: z.string(), domain: z.string(), direct: z.boolean() })
            .passthrough(),
          match: z
            .object({
              level: z.enum(['primary', 'secondary']),
              confidence: z.number().nullable()
            })
            .passthrough()
        })
        .passthrough()
    ),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    meta: z.object({ count: z.number().int() }).passthrough(),
    ...responseMetadata
  })
  .passthrough();

const searchNews = contextTool('get-news-search')
  .output(newsSchema)
  .handleInvocation(async ctx => {
    const filters = ctx.input.filterBy;
    const categories = ['sourceDomain', 'sourceCountry', 'articleLanguage', 'articleType'];
    if (filters && categories.filter(category => filters[category] !== undefined).length > 1) {
      throw createApiServiceError(
        'Use at most one news filter category: sourceDomain, sourceCountry, articleLanguage, or articleType.'
      );
    }
    if (
      filters?.date?.from !== undefined &&
      filters.date.to !== undefined &&
      filters.date.from > filters.date.to
    ) {
      throw createApiServiceError(
        'filterBy.date.from must be before or equal to filterBy.date.to.'
      );
    }
    const output = await new ContextClient(ctx.auth.token).request<z.infer<typeof newsSchema>>(
      'search company news',
      { method: 'POST', path: '/news/search', body: ctx.input }
    );
    return { output, message: `Found ${output.data.length} company news articles.` };
  })
  .build();

export const intelligenceTools = [
  retrieveBrand,
  getBrand,
  searchBrands,
  extractStyleguide,
  enrichPerson,
  searchNews
];
