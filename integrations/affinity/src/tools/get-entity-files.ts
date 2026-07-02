import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let entityFileSchema = z.object({
  entityFileId: z.number().describe('Unique identifier of the entity file'),
  name: z.string().nullable().describe('File name'),
  size: z.number().nullable().describe('File size in bytes'),
  personId: z.number().nullable().describe('ID of the associated person'),
  organizationId: z.number().nullable().describe('ID of the associated organization'),
  opportunityId: z.number().nullable().describe('ID of the associated opportunity'),
  uploaderId: z.number().nullable().describe('ID of the user who uploaded the file'),
  createdAt: z.string().nullable().describe('Upload timestamp')
});

export let getEntityFiles = SlateTool.create(spec, {
  name: 'Get Entity Files',
  key: 'get_entity_files',
  description: `Retrieve files attached to a person, organization, or opportunity in Affinity. Lists file metadata including name, size, and uploader.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Get files for this person'),
      organizationId: z.number().optional().describe('Get files for this organization'),
      opportunityId: z.number().optional().describe('Get files for this opportunity'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      files: z.array(entityFileSchema).describe('List of entity files'),
      nextPageToken: z.string().nullable().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.listEntityFiles({
      personId: ctx.input.personId,
      organizationId: ctx.input.organizationId,
      opportunityId: ctx.input.opportunityId,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let files = (result.entity_files ?? result ?? []).map((f: any) => ({
      entityFileId: f.id,
      name: f.name ?? null,
      size: f.size ?? null,
      personId: f.person_id ?? null,
      organizationId: f.organization_id ?? null,
      opportunityId: f.opportunity_id ?? null,
      uploaderId: f.uploader_id ?? null,
      createdAt: f.created_at ?? null
    }));

    return {
      output: {
        files,
        nextPageToken: result.next_page_token ?? null
      },
      message: `Retrieved **${files.length}** file(s).`
    };
  })
  .build();
