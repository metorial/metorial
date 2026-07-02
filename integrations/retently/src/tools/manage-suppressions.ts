import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSuppressions = SlateTool.create(spec, {
  name: 'Manage Suppressions',
  key: 'manage_suppressions',
  description: `Manage the suppression list to block specific email addresses or domain patterns from receiving surveys.
Supports listing, adding, and removing suppressed emails and domain patterns. Domain patterns support wildcards (e.g., \`*.example.com\`) and categorization (corporate, disposable, invalid).
Only manually added suppressions can be removed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_emails',
          'add_email',
          'remove_email',
          'list_domains',
          'add_domain',
          'remove_domain'
        ])
        .describe('Suppression action to perform'),
      email: z.string().optional().describe('Email address (for add_email)'),
      pattern: z
        .string()
        .optional()
        .describe('Domain pattern, supports wildcards like *.example.com (for add_domain)'),
      category: z
        .enum(['other', 'corporate', 'disposable', 'invalid'])
        .optional()
        .describe('Domain suppression category (for add_domain)'),
      note: z
        .string()
        .optional()
        .describe('Reason for suppression (for add_email or add_domain)'),
      suppressionId: z
        .string()
        .optional()
        .describe('Suppression entry ID (for remove_email or remove_domain)')
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(z.any())
        .optional()
        .describe('List of suppression entries (for list actions)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list_emails': {
        let data = await client.getSuppressedEmails();
        let items = Array.isArray(data) ? data : [];
        return {
          output: { suppressions: items, success: true },
          message: `Retrieved **${items.length}** suppressed email(s).`
        };
      }
      case 'add_email': {
        if (!ctx.input.email) throw new Error('Email is required for add_email action');
        await client.addSuppressedEmail(ctx.input.email, ctx.input.note);
        return {
          output: { success: true },
          message: `Added **${ctx.input.email}** to the email suppression list.`
        };
      }
      case 'remove_email': {
        if (!ctx.input.suppressionId)
          throw new Error('Suppression ID is required for remove_email action');
        await client.removeSuppressedEmail(ctx.input.suppressionId);
        return {
          output: { success: true },
          message: `Removed email suppression entry **${ctx.input.suppressionId}**.`
        };
      }
      case 'list_domains': {
        let data = await client.getSuppressedDomains();
        let items = Array.isArray(data) ? data : [];
        return {
          output: { suppressions: items, success: true },
          message: `Retrieved **${items.length}** suppressed domain pattern(s).`
        };
      }
      case 'add_domain': {
        if (!ctx.input.pattern) throw new Error('Pattern is required for add_domain action');
        await client.addSuppressedDomain(
          ctx.input.pattern,
          ctx.input.category,
          ctx.input.note
        );
        return {
          output: { success: true },
          message: `Added domain pattern **${ctx.input.pattern}** to the suppression list.`
        };
      }
      case 'remove_domain': {
        if (!ctx.input.suppressionId)
          throw new Error('Suppression ID is required for remove_domain action');
        await client.removeSuppressedDomain(ctx.input.suppressionId);
        return {
          output: { success: true },
          message: `Removed domain suppression entry **${ctx.input.suppressionId}**.`
        };
      }
    }
  })
  .build();
