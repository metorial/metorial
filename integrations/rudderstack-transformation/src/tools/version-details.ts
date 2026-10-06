import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const version = (kind: 'transformation' | 'library') => {
  const idKey = kind === 'transformation' ? 'transformationId' : 'libraryId';
  return SlateTool.create(spec, {
    key: kind === 'transformation' ? 'get_transformation_version' : 'get_library_version',
    name: kind === 'transformation' ? 'Get Transformation Version' : 'Get Library Version',
    description: `Inspect the exact ${kind} revision discovered with list_${kind}_versions before testing, publishing or rolling back. Returns code and version metadata without changing deployment.`,
    tags: { readOnly: true }
  })
    .input(
      z.object({
        [idKey]: z
          .string()
          .describe(
            `Resource ID from list_${kind === 'transformation' ? 'transformations' : 'libraries'}.`
          ),
        versionId: z
          .string()
          .describe(`Revision ID from list_${kind}_versions, distinct from the resource ID.`)
      })
    )
    .output(
      z.object({
        resourceId: z.string(),
        versionId: z.string(),
        name: z.string().nullable(),
        description: z.string().nullable(),
        code: z.string(),
        language: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        isPublished: z.boolean().optional()
      })
    )
    .handleInvocation(async ctx => {
      const client = new Client({ token: ctx.auth.token, region: ctx.config.region });
      const id = ctx.input[idKey];
      const versionId = ctx.input.versionId;
      if (!id || !versionId)
        throw createApiServiceError(`Provide the ${idKey} and versionId for this revision.`);
      const value =
        kind === 'transformation'
          ? await client.getTransformationVersion(id, versionId)
          : await client.getLibraryVersion(id, versionId);
      return {
        output: {
          resourceId: value.id,
          versionId: value.versionId,
          name: value.name,
          description: value.description,
          code: value.code,
          language: value.language,
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
          isPublished: value.isPublished
        },
        message: `Retrieved ${kind} revision ${value.versionId}.`
      };
    })
    .build();
};
export const getTransformationVersion = version('transformation');
export const getLibraryVersion = version('library');
