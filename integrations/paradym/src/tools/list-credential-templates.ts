import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { credentialFormatSchema, projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCredentialTemplates = SlateTool.create(spec, {
  name: 'List Credential Templates',
  key: 'list_credential_templates',
  description: `Retrieve credential templates configured in a Paradym project. Returns templates for all supported formats (SD-JWT VC, mDOC, AnonCreds) including their attributes, branding, issuer settings, and revocability configuration.`,
  instructions: ['Call list_projects to choose the projectId for this operation.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      format: credentialFormatSchema
        .optional()
        .describe(
          'Limit to one format. Specify a format when paging; without a format the first page of each format is returned.'
        ),
      pageSize: z
        .number()
        .optional()
        .describe('Number of templates to return per page (max 20)'),
      pageAfter: z.string().optional().describe('Cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      pagination: z
        .array(z.object({ format: credentialFormatSchema, metadata: z.any().optional() }))
        .describe('Provider pagination metadata for each requested format'),
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the credential template'),
            name: z.string().describe('Name of the credential template'),
            format: z
              .string()
              .optional()
              .describe('Credential format: sd-jwt-vc, mdoc, or anoncreds'),
            type: z.string().optional().describe('Credential type identifier'),
            description: z
              .string()
              .optional()
              .describe('Description of the credential template'),
            revocable: z
              .boolean()
              .optional()
              .describe('Whether credentials from this template can be revoked'),
            createdAt: z.string().optional().describe('ISO 8601 timestamp of creation'),
            updatedAt: z.string().optional().describe('ISO 8601 timestamp of last update'),
            attributes: z.any().optional().describe('Template attribute definitions')
          })
        )
        .describe('List of credential templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.input.projectId ?? ctx.config.projectId
    });

    if (!ctx.input.format && ctx.input.pageAfter) {
      throw createApiServiceError(
        'Specify format when using pageAfter; each credential format has its own cursor.'
      );
    }
    let formats = ctx.input.format ? [ctx.input.format] : credentialFormatSchema.options;
    let templates: any[] = [];
    let pagination: { format: (typeof formats)[number]; metadata?: unknown }[] = [];
    for (let format of formats) {
      let result = await client.listCredentialTemplates(format, {
        pageSize: ctx.input.pageSize,
        pageAfter: ctx.input.pageAfter
      });
      templates.push(
        ...result.data.map((t: any) => ({
          templateId: t.id,
          name: t.name,
          format: t.format,
          type: t.type,
          description: t.description ?? undefined,
          revocable: t.revocable,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          attributes: t.attributes
        }))
      );
      pagination.push({ format, metadata: result.meta });
    }

    return {
      output: { templates, pagination },
      message: `Found **${templates.length}** credential template(s).`
    };
  })
  .build();
