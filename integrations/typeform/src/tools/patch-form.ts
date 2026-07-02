import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { typeformServiceError } from '../lib/errors';
import { spec } from '../spec';

let patchPathSchema = z.enum([
  '/settings/enrichment_in_renderer',
  '/settings/facebook_pixel',
  '/settings/google_analytics',
  '/settings/google_tag_manager',
  '/settings/is_public',
  '/settings/meta',
  '/theme',
  '/title',
  '/workspace'
]);

export let patchForm = SlateTool.create(spec, {
  name: 'Patch Form',
  key: 'patch_form',
  description: `Safely update supported form-level properties without replacing the full form definition. Use this for title, public/private status, theme, workspace, SEO metadata, and tracking settings.`,
  instructions: [
    'For field, screen, logic, or variable changes, use **Update Form** with a complete form definition.',
    'This tool uses Typeform PATCH and leaves fields and responses intact.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to patch'),
      title: z.string().optional().describe('New form title'),
      isPublic: z.boolean().optional().describe('Whether the form is public'),
      themeUrl: z.string().optional().describe('Theme API URL to apply'),
      workspaceUrl: z.string().optional().describe('Workspace API URL to move the form into'),
      meta: z.any().optional().describe('Form SEO metadata object'),
      facebookPixel: z.any().optional().describe('Facebook Pixel settings'),
      googleAnalytics: z.any().optional().describe('Google Analytics settings'),
      googleTagManager: z.any().optional().describe('Google Tag Manager settings'),
      enrichmentInRenderer: z.any().optional().describe('Data enrichment renderer settings'),
      operations: z
        .array(
          z.object({
            op: z.enum(['replace']).default('replace').describe('JSON Patch operation'),
            path: patchPathSchema.describe('Supported Typeform patch path'),
            value: z.any().describe('Patch value')
          })
        )
        .optional()
        .describe('Advanced Typeform patch operations')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the patched form'),
      title: z.string().describe('Current form title'),
      isPublic: z.boolean().optional().describe('Whether the form is public'),
      themeUrl: z.string().optional().describe('Applied theme URL'),
      workspaceUrl: z.string().optional().describe('Workspace URL'),
      displayUrl: z.string().optional().describe('Public form URL'),
      updatedFields: z.array(z.string()).describe('Patched paths')
    })
  )
  .handleInvocation(async ctx => {
    let operations: Array<{ op: 'replace'; path: string; value: any }> = (
      ctx.input.operations ?? []
    ).map(operation => ({
      op: 'replace',
      path: operation.path,
      value: operation.value
    }));

    if (ctx.input.title !== undefined) {
      operations.push({ op: 'replace', path: '/title', value: ctx.input.title });
    }
    if (ctx.input.isPublic !== undefined) {
      operations.push({
        op: 'replace',
        path: '/settings/is_public',
        value: ctx.input.isPublic
      });
    }
    if (ctx.input.themeUrl !== undefined) {
      operations.push({
        op: 'replace',
        path: '/theme',
        value: { href: ctx.input.themeUrl }
      });
    }
    if (ctx.input.workspaceUrl !== undefined) {
      operations.push({
        op: 'replace',
        path: '/workspace',
        value: { href: ctx.input.workspaceUrl }
      });
    }
    if (ctx.input.meta !== undefined) {
      operations.push({ op: 'replace', path: '/settings/meta', value: ctx.input.meta });
    }
    if (ctx.input.facebookPixel !== undefined) {
      operations.push({
        op: 'replace',
        path: '/settings/facebook_pixel',
        value: ctx.input.facebookPixel
      });
    }
    if (ctx.input.googleAnalytics !== undefined) {
      operations.push({
        op: 'replace',
        path: '/settings/google_analytics',
        value: ctx.input.googleAnalytics
      });
    }
    if (ctx.input.googleTagManager !== undefined) {
      operations.push({
        op: 'replace',
        path: '/settings/google_tag_manager',
        value: ctx.input.googleTagManager
      });
    }
    if (ctx.input.enrichmentInRenderer !== undefined) {
      operations.push({
        op: 'replace',
        path: '/settings/enrichment_in_renderer',
        value: ctx.input.enrichmentInRenderer
      });
    }

    if (operations.length === 0) {
      throw typeformServiceError('Provide at least one supported form patch field.');
    }

    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.patchForm(ctx.input.formId, operations);
    let form = await client.getForm(ctx.input.formId);
    let updatedFields = operations.map(operation => operation.path);

    return {
      output: {
        formId: form.id,
        title: form.title,
        isPublic: form.settings?.is_public,
        themeUrl: form.theme?.href,
        workspaceUrl: form.workspace?.href,
        displayUrl: form._links?.display,
        updatedFields
      },
      message: `Patched form **${form.title}** (${form.id}): ${updatedFields.join(', ')}.`
    };
  })
  .build();
