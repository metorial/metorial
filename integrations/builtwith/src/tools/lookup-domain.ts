import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let technologySchema = z
  .object({
    name: z.string().optional().describe('Technology name'),
    description: z.string().optional().describe('Technology description'),
    link: z.string().optional().describe('Technology website URL'),
    tag: z.string().optional().describe('Technology category tag'),
    categories: z.array(z.string()).optional().describe('Technology categories'),
    firstDetected: z.string().optional().describe('Date technology was first detected'),
    lastDetected: z.string().optional().describe('Date technology was last detected')
  })
  .passthrough();

let pathSchema = z
  .object({
    domain: z.string().optional().describe('Domain name'),
    url: z.string().optional().describe('Full URL'),
    subDomain: z.string().optional().describe('Subdomain'),
    technologies: z
      .array(technologySchema)
      .optional()
      .describe('Technologies detected on this path')
  })
  .passthrough();

let resultSchema = z
  .object({
    lookup: z.string().optional().describe('Domain that was looked up'),
    paths: z.array(pathSchema).optional().describe('Paths with technology detections'),
    meta: z
      .any()
      .optional()
      .describe('Metadata about the domain (address, contacts, social profiles, etc.)'),
    attributes: z.any().optional().describe('Domain attributes'),
    firstIndexed: z.string().optional().describe('Date domain was first indexed'),
    lastIndexed: z.string().optional().describe('Date domain was last indexed')
  })
  .passthrough();

export let lookupDomain = SlateTool.create(spec, {
  name: 'Lookup Domain Technologies',
  key: 'lookup_domain',
  description: `Profile a website's full technology stack from BuiltWith's database. Returns current and historical technologies including frameworks, analytics, widgets, CMS platforms, hosting providers, and more. Includes optional metadata like company addresses, emails, social profiles, and domain attributes.

Supports filtering to live technologies only, excluding metadata or PII, and filtering by first/last detected date ranges.`,
  instructions: [
    'Provide the domain without protocol (e.g., "example.com" not "https://example.com").',
    'Use onlyLiveTechnologies to filter out historical/removed technologies.',
    'Use noMetaData to improve performance when you only need technology data.'
  ],
  constraints: ['Maximum 8 concurrent requests, 10 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to look up (e.g., "example.com")'),
      onlyLiveTechnologies: z
        .boolean()
        .optional()
        .describe('Only return technologies currently in use'),
      hideAll: z
        .boolean()
        .optional()
        .describe('Hide technology descriptions, links, tags, and categories'),
      hideDescriptionAndLinks: z
        .boolean()
        .optional()
        .describe('Hide technology descriptions and links but keep tags and categories'),
      noMetaData: z
        .boolean()
        .optional()
        .describe('Exclude metadata (addresses, names, etc.) to improve performance'),
      noAttributeData: z.boolean().optional().describe('Exclude attribute data'),
      noPii: z.boolean().optional().describe('Exclude personally identifiable information'),
      firstDetectedSince: z
        .string()
        .optional()
        .describe(
          'Only return technologies first detected after this date (Unix timestamp in ms)'
        ),
      lastDetectedSince: z
        .string()
        .optional()
        .describe(
          'Only return technologies last detected after this date (Unix timestamp in ms)'
        )
    })
  )
  .output(
    z.object({
      results: z.array(resultSchema).describe('Technology profile results'),
      errors: z.array(z.string()).optional().describe('Any errors returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.domainLookup({
      domain: ctx.input.domain,
      hideAll: ctx.input.hideAll,
      hideDescriptionAndLinks: ctx.input.hideDescriptionAndLinks,
      onlyLiveTechnologies: ctx.input.onlyLiveTechnologies,
      noMetaData: ctx.input.noMetaData,
      noAttributeData: ctx.input.noAttributeData,
      noPii: ctx.input.noPii,
      firstDetectedSince: ctx.input.firstDetectedSince,
      lastDetectedSince: ctx.input.lastDetectedSince
    });

    let results = data?.Results ?? [];
    let errors = data?.Errors ?? [];

    let techCount = 0;
    for (let result of results) {
      for (let path of result?.Paths ?? []) {
        techCount += (path?.Technologies ?? []).length;
      }
    }

    return {
      output: {
        results,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Found **${techCount} technologies** across **${results.length}** result(s) for **${ctx.input.domain}**.`
    };
  });
