import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newLink = SlateTrigger.create(spec, {
  name: 'New Link Created',
  key: 'new_link',
  description: 'Triggers when a new short link is created on a domain.'
})
  .input(
    z.object({
      linkId: z.string().describe('The unique link ID string.'),
      originalURL: z.string().describe('The destination URL.'),
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
  .output(
    z.object({
      linkId: z.string().describe('The unique link ID string.'),
      originalURL: z.string().describe('The destination URL.'),
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
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let domainId = ctx.config.domainId;
      if (!domainId) {
        // Try to get the first domain if no domainId configured
        let domains = await client.listDomains();
        if (domains.length === 0) {
          return { inputs: [], updatedState: ctx.state };
        }
        domainId = domains[0]!.id;
      }

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let result = await client.listLinks({
        domainId,
        limit: 150,
        dateSortOrder: 'desc',
        ...(lastPolledAt ? { afterDate: lastPolledAt } : {})
      });

      let now = new Date().toISOString();

      let inputs = result.links.map(link => ({
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
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: inputs.length > 0 ? now : lastPolledAt || now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'link.created',
        id: ctx.input.linkId,
        output: {
          linkId: ctx.input.linkId,
          originalURL: ctx.input.originalURL,
          shortURL: ctx.input.shortURL,
          secureShortURL: ctx.input.secureShortURL,
          path: ctx.input.path,
          title: ctx.input.title,
          tags: ctx.input.tags,
          cloaking: ctx.input.cloaking,
          archived: ctx.input.archived,
          createdAt: ctx.input.createdAt,
          domainId: ctx.input.domainId
        }
      };
    }
  })
  .build();
