import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLink = SlateTool.create(spec, {
  name: 'Create Short Link',
  key: 'create_link',
  description: `Create a new shortened link on Short.io. Shorten a long URL into a branded short link with optional custom slug, title, tags, expiration, mobile targeting, password protection, cloaking, and UTM parameters.`,
  instructions: [
    'Either provide a domain in the input or configure a default domain in the global config.',
    'If path is omitted, a short path is auto-generated based on domain settings.',
    'If the same originalURL already exists and no custom path is given, the existing link is returned.'
  ],
  constraints: [
    'Rate limit: 50 requests per second.',
    'If a path already exists with a different originalURL, a 409 conflict error is returned.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe(
          'Domain hostname to create the link on (e.g., "example.short.gy"). Falls back to config default.'
        ),
      originalURL: z.string().describe('The destination URL to shorten.'),
      path: z
        .string()
        .optional()
        .describe('Custom slug/path for the short link. Auto-generated if omitted.'),
      title: z.string().optional().describe('Custom title for the link.'),
      tags: z.array(z.string()).optional().describe('Tags to categorize the link.'),
      allowDuplicates: z
        .boolean()
        .optional()
        .describe('Allow creating duplicate links for the same original URL.'),
      cloaking: z.boolean().optional().describe('Hide the destination URL from visitors.'),
      redirectType: z
        .number()
        .optional()
        .describe('HTTP redirect code: 301, 302, 307, or 308.'),
      password: z.string().optional().describe('Password-protect the link.'),
      iphoneURL: z.string().optional().describe('Redirect URL for iPhone/iOS users.'),
      androidURL: z.string().optional().describe('Redirect URL for Android users.'),
      expiresAt: z.string().optional().describe('Expiration date/time in ISO 8601 format.'),
      expiredURL: z.string().optional().describe('URL to redirect to after the link expires.'),
      clicksLimit: z.number().optional().describe('Disable the link after this many clicks.'),
      ttl: z.string().optional().describe('Time-to-live for automatic expiration.'),
      skipQS: z.boolean().optional().describe('Skip forwarding query string parameters.'),
      utmSource: z.string().optional().describe('UTM source parameter.'),
      utmMedium: z.string().optional().describe('UTM medium parameter.'),
      utmCampaign: z.string().optional().describe('UTM campaign parameter.'),
      utmTerm: z.string().optional().describe('UTM term parameter.'),
      utmContent: z.string().optional().describe('UTM content parameter.'),
      folderId: z.string().optional().describe('Folder ID to place the link in.')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('The unique ID of the created link.'),
      originalURL: z.string().describe('The original destination URL.'),
      shortURL: z.string().describe('The shortened URL.'),
      secureShortURL: z.string().describe('The HTTPS shortened URL.'),
      path: z.string().describe('The slug/path of the short link.'),
      title: z.string().nullable().describe('Title of the link.'),
      tags: z.array(z.string()).nullable().describe('Tags on the link.'),
      cloaking: z.boolean().nullable().describe('Whether cloaking is enabled.'),
      archived: z.boolean().describe('Whether the link is archived.'),
      createdAt: z.string().describe('Creation timestamp.'),
      domainId: z.number().describe('The domain ID the link belongs to.')
    })
  )
  .handleInvocation(async ctx => {
    let domain = ctx.input.domain || ctx.config.domain;
    if (!domain) {
      throw new Error(
        'Domain is required. Provide it in the input or set a default domain in config.'
      );
    }

    let client = new Client({ token: ctx.auth.token });

    let link = await client.createLink({
      domain,
      originalURL: ctx.input.originalURL,
      path: ctx.input.path,
      title: ctx.input.title,
      tags: ctx.input.tags,
      allowDuplicates: ctx.input.allowDuplicates,
      cloaking: ctx.input.cloaking,
      redirectType: ctx.input.redirectType,
      password: ctx.input.password,
      iphoneURL: ctx.input.iphoneURL,
      androidURL: ctx.input.androidURL,
      expiresAt: ctx.input.expiresAt,
      expiredURL: ctx.input.expiredURL,
      clicksLimit: ctx.input.clicksLimit,
      ttl: ctx.input.ttl,
      skipQS: ctx.input.skipQS,
      utmSource: ctx.input.utmSource,
      utmMedium: ctx.input.utmMedium,
      utmCampaign: ctx.input.utmCampaign,
      utmTerm: ctx.input.utmTerm,
      utmContent: ctx.input.utmContent,
      folderId: ctx.input.folderId
    });

    return {
      output: {
        linkId: link.idString,
        originalURL: link.originalURL,
        shortURL: link.shortURL,
        secureShortURL: link.secureShortURL,
        path: link.path,
        title: link.title,
        tags: link.tags,
        cloaking: link.cloaking,
        archived: link.archived,
        createdAt: link.createdAt,
        domainId: link.DomainId
      },
      message: `Created short link **${link.secureShortURL}** → ${link.originalURL}`
    };
  })
  .build();
