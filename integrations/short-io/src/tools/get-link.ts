import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLink = SlateTool.create(spec, {
  name: 'Get Link',
  key: 'get_link',
  description: `Retrieve details of a short link. Look up a link by its ID, by its short path on a domain, or by its original destination URL.`,
  instructions: [
    'Provide linkId to look up by ID, or provide domain + path to look up by short URL path, or provide domain + originalURL to look up by destination URL.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkId: z.string().optional().describe('The link ID to look up directly.'),
      domain: z
        .string()
        .optional()
        .describe(
          'Domain hostname for path or original URL lookups. Falls back to config default.'
        ),
      path: z.string().optional().describe('Short URL path/slug to expand.'),
      originalURL: z
        .string()
        .optional()
        .describe('Original destination URL to find the link for.')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('The unique ID of the link.'),
      originalURL: z.string().describe('The destination URL.'),
      shortURL: z.string().describe('The shortened URL.'),
      secureShortURL: z.string().describe('The HTTPS shortened URL.'),
      path: z.string().describe('The slug/path of the short link.'),
      title: z.string().nullable().describe('Title of the link.'),
      tags: z.array(z.string()).nullable().describe('Tags on the link.'),
      cloaking: z.boolean().nullable().describe('Whether cloaking is enabled.'),
      archived: z.boolean().describe('Whether the link is archived.'),
      password: z.string().nullable().describe('Password if set.'),
      iphoneURL: z.string().nullable().describe('iOS redirect URL.'),
      androidURL: z.string().nullable().describe('Android redirect URL.'),
      expiresAt: z.string().nullable().describe('Expiration timestamp.'),
      expiredURL: z.string().nullable().describe('Redirect URL after expiration.'),
      clicksLimit: z.number().nullable().describe('Click limit before disabling.'),
      redirectType: z.number().nullable().describe('HTTP redirect status code.'),
      createdAt: z.string().describe('Creation timestamp.'),
      updatedAt: z.string().describe('Last updated timestamp.'),
      domainId: z.number().describe('The domain ID the link belongs to.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let link: any;

    if (ctx.input.linkId) {
      link = await client.getLink(ctx.input.linkId);
    } else if (ctx.input.path) {
      let domain = ctx.input.domain || ctx.config.domain;
      if (!domain) {
        throw new Error(
          'Domain is required for path lookup. Provide it in the input or set a default in config.'
        );
      }
      link = await client.expandLink(domain, ctx.input.path);
    } else if (ctx.input.originalURL) {
      let domain = ctx.input.domain || ctx.config.domain;
      if (!domain) {
        throw new Error(
          'Domain is required for original URL lookup. Provide it in the input or set a default in config.'
        );
      }
      link = await client.getLinkByOriginalUrl(domain, ctx.input.originalURL);
    } else {
      throw new Error(
        'Provide either linkId, domain + path, or domain + originalURL to look up a link.'
      );
    }

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
        password: link.password,
        iphoneURL: link.iphoneURL,
        androidURL: link.androidURL,
        expiresAt: link.expiresAt,
        expiredURL: link.expiredURL,
        clicksLimit: link.clicksLimit,
        redirectType: link.redirectType,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        domainId: link.DomainId
      },
      message: `Retrieved link **${link.secureShortURL}** → ${link.originalURL}`
    };
  })
  .build();
