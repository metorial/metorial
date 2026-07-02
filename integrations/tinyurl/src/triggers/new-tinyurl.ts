import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTinyUrl = SlateTrigger.create(spec, {
  name: 'New TinyURL Created',
  key: 'new_tinyurl',
  description:
    'Triggers when a new TinyURL is created on your account. Polls for newly created links.'
})
  .input(
    z.object({
      tinyUrl: z.string().describe('The shortened URL'),
      domain: z.string().describe('Domain of the shortened URL'),
      alias: z.string().describe('Alias portion of the shortened URL'),
      url: z.string().describe('The original destination URL'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      expiresAt: z.string().nullable().describe('ISO 8601 expiration timestamp or null'),
      tags: z.array(z.string()).describe('Tags assigned to the link'),
      description: z.string().nullable().describe('Description of the link')
    })
  )
  .output(
    z.object({
      tinyUrl: z.string().describe('The shortened URL'),
      domain: z.string().describe('Domain of the shortened URL'),
      alias: z.string().describe('Alias portion of the shortened URL'),
      url: z.string().describe('The original destination URL'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      expiresAt: z.string().nullable().describe('ISO 8601 expiration timestamp or null'),
      tags: z.array(z.string()).describe('Tags assigned to the link'),
      description: z.string().nullable().describe('Description of the link')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let knownAliases = (ctx.state?.knownAliases as string[] | undefined) || [];

      let links = await client.listTinyUrls({
        type: 'available',
        from: lastPolledAt
      });

      let newLinks = links.filter(
        link => !knownAliases.includes(`${link.domain}/${link.alias}`)
      );

      let updatedKnownAliases = [
        ...knownAliases,
        ...newLinks.map(link => `${link.domain}/${link.alias}`)
      ];

      // Keep only the most recent 1000 aliases to prevent unbounded growth
      if (updatedKnownAliases.length > 1000) {
        updatedKnownAliases = updatedKnownAliases.slice(updatedKnownAliases.length - 1000);
      }

      return {
        inputs: newLinks.map(link => ({
          tinyUrl: link.tiny_url,
          domain: link.domain,
          alias: link.alias,
          url: link.url,
          createdAt: link.created_at,
          expiresAt: link.expires_at,
          tags: link.tags || [],
          description: link.description
        })),
        updatedState: {
          lastPolledAt: new Date().toISOString(),
          knownAliases: updatedKnownAliases
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'tinyurl.created',
        id: `${ctx.input.domain}/${ctx.input.alias}`,
        output: {
          tinyUrl: ctx.input.tinyUrl,
          domain: ctx.input.domain,
          alias: ctx.input.alias,
          url: ctx.input.url,
          createdAt: ctx.input.createdAt,
          expiresAt: ctx.input.expiresAt,
          tags: ctx.input.tags,
          description: ctx.input.description
        }
      };
    }
  })
  .build();
