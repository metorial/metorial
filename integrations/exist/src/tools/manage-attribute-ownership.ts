import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAttributeOwnershipTool = SlateTool.create(spec, {
  name: 'Manage Attribute Ownership',
  key: 'manage_attribute_ownership',
  description: `Acquire or release ownership of attributes. You must own an attribute before writing data to it. Acquiring a templated attribute the user doesn't have yet will create it automatically. Releasing an attribute passes ownership to another connected service or deactivates it.`,
  instructions: [
    'Use action "acquire" to claim ownership and "release" to relinquish it.',
    'When acquiring, provide either a template name or a custom attribute name.',
    'Acquiring a template attribute that does not exist for the user will create it.'
  ],
  constraints: [
    'Maximum 35 attributes per call.',
    'Requires OAuth2 authentication with appropriate write scope.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['acquire', 'release'])
        .describe('Whether to acquire or release ownership'),
      attributes: z
        .array(
          z.object({
            templateName: z
              .string()
              .optional()
              .describe('Template name to acquire (for templated attributes)'),
            attributeName: z
              .string()
              .optional()
              .describe('Attribute name (for acquiring custom attributes or releasing)'),
            manual: z
              .boolean()
              .optional()
              .describe('Whether data will be entered manually by the user (only for acquire)')
          })
        )
        .min(1)
        .max(35)
        .describe('List of attributes to acquire or release')
    })
  )
  .output(
    z.object({
      successCount: z.number().describe('Number of successfully processed attributes'),
      failedCount: z.number().describe('Number of failed operations'),
      failures: z
        .array(
          z.object({
            attributeName: z.string().optional().describe('Attribute that failed'),
            error: z.string().describe('Error message')
          })
        )
        .describe('Details of any failures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result: any;
    if (ctx.input.action === 'acquire') {
      let payload = ctx.input.attributes.map(a => ({
        template: a.templateName,
        name: a.attributeName,
        manual: a.manual
      }));
      result = await client.acquireAttributes(payload);
    } else {
      let payload = ctx.input.attributes.map(a => ({
        name: a.attributeName || a.templateName || ''
      }));
      result = await client.releaseAttributes(payload);
    }

    let failures = result.failed.map((f: any) => ({
      attributeName: (f as Record<string, unknown>).name as string | undefined,
      error: f.error
    }));

    return {
      output: {
        successCount: result.success.length,
        failedCount: result.failed.length,
        failures
      },
      message: `${ctx.input.action === 'acquire' ? 'Acquired' : 'Released'} **${result.success.length}** attribute(s)${result.failed.length > 0 ? `, **${result.failed.length}** failed` : ''}.`
    };
  })
  .build();
