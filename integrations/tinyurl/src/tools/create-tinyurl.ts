import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTinyUrl = SlateTool.create(spec, {
  name: 'Create TinyURL',
  key: 'create_tinyurl',
  description: `Create a shortened URL from a long URL. Optionally specify a custom alias, domain, tags, expiration date, and description.
Note that **tags**, **expiration**, and **description** require a paid TinyURL subscription.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The long URL to shorten'),
      domain: z
        .string()
        .optional()
        .describe('Domain for the short URL (defaults to tinyurl.com)'),
      alias: z
        .string()
        .optional()
        .describe('Custom alias for the short URL (5-30 characters)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for categorizing the link (paid feature, max 45 chars each)'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 expiration timestamp (paid feature)'),
      description: z
        .string()
        .optional()
        .describe('Description for the link, 3-1000 characters (paid feature)')
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTinyUrl({
      url: ctx.input.url,
      domain: ctx.input.domain,
      alias: ctx.input.alias,
      tags: ctx.input.tags,
      expiresAt: ctx.input.expiresAt,
      description: ctx.input.description
    });

    return {
      output: {
        tinyUrl: result.tiny_url,
        domain: result.domain,
        alias: result.alias,
        url: result.url,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        tags: result.tags || [],
        description: result.description
      },
      message: `Created TinyURL **${result.tiny_url}** → ${result.url}`
    };
  })
  .build();
