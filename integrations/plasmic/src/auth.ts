import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      projectId: z.string().optional(),
      projectToken: z.string().optional(),
      projectSecretToken: z.string().optional(),
      cmsId: z.string().optional(),
      cmsPublicToken: z.string().optional(),
      cmsSecretToken: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Project & CMS Credentials',
    key: 'project_and_cms',

    inputSchema: z.object({
      projectId: z.string().optional().describe('Plasmic project ID'),
      projectToken: z
        .string()
        .optional()
        .describe('Public API token for the project (for read/render operations)'),
      projectSecretToken: z
        .string()
        .optional()
        .describe('Secret API token for the project (for write operations, enterprise only)'),
      cmsId: z.string().optional().describe('CMS database ID'),
      cmsPublicToken: z.string().optional().describe('CMS public token (for read operations)'),
      cmsSecretToken: z.string().optional().describe('CMS secret token (for write operations)')
    }),

    getOutput: async ctx => {
      let projectToken = ctx.input.projectToken || ctx.input.projectSecretToken;
      let cmsToken = ctx.input.cmsPublicToken || ctx.input.cmsSecretToken;
      if (projectToken && !ctx.input.projectId) {
        throw createApiServiceError('Provide the project ID for the project token.');
      }
      if (cmsToken && !ctx.input.cmsId) {
        throw createApiServiceError('Provide the CMS database ID for the CMS token.');
      }
      if (ctx.input.projectId && !projectToken) {
        throw createApiServiceError('Provide a public or secret token for the project.');
      }
      if (ctx.input.cmsId && !cmsToken) {
        throw createApiServiceError('Provide a public or secret token for the CMS database.');
      }
      if (!projectToken && !cmsToken) {
        throw createApiServiceError('Provide project credentials, CMS credentials, or both.');
      }
      return {
        output: {
          projectId: ctx.input.projectId,
          projectToken: ctx.input.projectToken,
          projectSecretToken: ctx.input.projectSecretToken,
          cmsId: ctx.input.cmsId,
          cmsPublicToken: ctx.input.cmsPublicToken,
          cmsSecretToken: ctx.input.cmsSecretToken
        }
      };
    }
  });
