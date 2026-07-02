import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let getFileVersions = SlateTool.create(spec, {
  name: 'Get File Versions',
  key: 'get_file_versions',
  description: `Retrieve the version history of a Figma file. Each version includes a label, description, timestamp, and the user who created it. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      pageSize: z.number().optional().describe('Number of versions to return per page'),
      before: z
        .string()
        .optional()
        .describe('Version ID cursor - return versions before this version'),
      after: z
        .string()
        .optional()
        .describe('Version ID cursor - return versions after this version')
    })
  )
  .output(
    z.object({
      versions: z
        .array(
          z.object({
            versionId: z.string().describe('Unique version identifier'),
            label: z.string().optional().describe('Named label for the version'),
            description: z.string().optional().describe('Description of the version'),
            createdAt: z.string().describe('When this version was created'),
            user: z
              .object({
                userId: z.string().describe('User ID'),
                handle: z.string().describe('Display name'),
                imageUrl: z.string().optional().describe('Avatar URL')
              })
              .optional()
              .describe('User who created this version')
          })
        )
        .describe('List of file versions'),
      pagination: z
        .object({
          nextPage: z.string().optional().describe('Cursor for fetching the next page')
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    let result = await client.getFileVersions(ctx.input.fileKey, {
      pageSize: ctx.input.pageSize,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let versions = (result.versions || []).map((v: any) => ({
      versionId: v.id,
      label: v.label ?? undefined,
      description: v.description ?? undefined,
      createdAt: v.created_at,
      user: v.user
        ? {
            userId: v.user.id,
            handle: v.user.handle,
            imageUrl: v.user.img_url ?? undefined
          }
        : undefined
    }));

    return {
      output: {
        versions,
        pagination: result.pagination
          ? {
              nextPage: result.pagination.next_page
            }
          : undefined
      },
      message: `Retrieved **${versions.length}** version(s) for file`
    };
  })
  .build();
