import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDomains = SlateTool.create(spec, {
  name: 'Manage Domains',
  key: 'manage_domains',
  description: `List, create, update, or delete custom domains for your short links. Domains let you use your own branded URLs instead of the default dub.sh domain.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      domainSlug: z
        .string()
        .optional()
        .describe('Domain slug (e.g., "acme.com"). Required for create, update, and delete'),
      newSlug: z.string().optional().describe('New slug when renaming a domain (update only)'),
      expiredUrl: z
        .string()
        .optional()
        .describe('Default redirect URL for expired links on this domain'),
      notFoundUrl: z
        .string()
        .optional()
        .describe('Default redirect URL for non-existent links on this domain'),
      archived: z.boolean().optional().describe('Archive/unarchive the domain'),
      placeholder: z
        .string()
        .optional()
        .describe('Placeholder text shown in the link creation modal')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: z.string(),
            slug: z.string(),
            verified: z.boolean(),
            primary: z.boolean(),
            archived: z.boolean(),
            createdAt: z.string()
          })
        )
        .optional()
        .describe('List of domains'),
      domain: z
        .object({
          domainId: z.string(),
          slug: z.string(),
          verified: z.boolean(),
          primary: z.boolean(),
          archived: z.boolean(),
          createdAt: z.string()
        })
        .optional()
        .describe('Created/updated domain'),
      deletedDomainSlug: z.string().optional().describe('Slug of deleted domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let domains = await client.listDomains();
      return {
        output: {
          domains: domains.map(d => ({
            domainId: d.id,
            slug: d.slug,
            verified: d.verified,
            primary: d.primary,
            archived: d.archived,
            createdAt: d.createdAt
          }))
        },
        message: `Found **${domains.length}** domains`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.domainSlug)
        throw new Error('domainSlug is required for creating a domain');
      let domain = await client.createDomain({
        slug: ctx.input.domainSlug,
        expiredUrl: ctx.input.expiredUrl,
        notFoundUrl: ctx.input.notFoundUrl,
        archived: ctx.input.archived,
        placeholder: ctx.input.placeholder
      });
      return {
        output: {
          domain: {
            domainId: domain.id,
            slug: domain.slug,
            verified: domain.verified,
            primary: domain.primary,
            archived: domain.archived,
            createdAt: domain.createdAt
          }
        },
        message: `Added domain **${domain.slug}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.domainSlug)
        throw new Error('domainSlug is required for updating a domain');
      let domain = await client.updateDomain(ctx.input.domainSlug, {
        slug: ctx.input.newSlug,
        expiredUrl: ctx.input.expiredUrl,
        notFoundUrl: ctx.input.notFoundUrl,
        archived: ctx.input.archived,
        placeholder: ctx.input.placeholder
      });
      return {
        output: {
          domain: {
            domainId: domain.id,
            slug: domain.slug,
            verified: domain.verified,
            primary: domain.primary,
            archived: domain.archived,
            createdAt: domain.createdAt
          }
        },
        message: `Updated domain **${domain.slug}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.domainSlug)
        throw new Error('domainSlug is required for deleting a domain');
      let result = await client.deleteDomain(ctx.input.domainSlug);
      return {
        output: {
          deletedDomainSlug: result.slug
        },
        message: `Deleted domain **${result.slug}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
