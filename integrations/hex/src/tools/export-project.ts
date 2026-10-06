import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const exportProject = SlateTool.create(spec, {
  name: 'Export Project',
  key: 'export_project',
  description:
    'Download a Hex project as a .hex.yaml file. Select the draft notebook, latest published version, or a specific positive version number. The export includes the project code and configuration accessible to your token; handle it according to its sensitivity.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().describe('Project UUID'),
      version: z
        .union([z.number().int().min(1), z.enum(['draft', 'latest'])])
        .optional()
        .describe(
          'Positive integer version, draft, or latest. Defaults to draft; this export does not execute the project.'
        )
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number(),
      version: z.union([z.number(), z.enum(['draft', 'latest'])])
    })
  )
  .handleInvocation(async ctx => {
    const version = ctx.input.version ?? 'draft';
    const file = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    }).exportProject(ctx.input.projectId, version);
    const mimeType = 'application/yaml';
    const size = Buffer.byteLength(file.content, 'utf8');
    await ctx.addAttachment({
      type: 'content',
      filename: file.filename,
      content: new Response(file.content, {
        headers: { 'content-type': `${mimeType}; charset=utf-8` }
      })
    });
    return {
      output: {
        projectId: ctx.input.projectId,
        filename: file.filename,
        mimeType,
        size,
        version
      },
      message: `Prepared **${file.filename}** for download.`
    };
  })
  .build();
