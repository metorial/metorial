import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let accessGroupSchema = z.object({
  accessGroupId: z.string().describe('Unique ID of the access group'),
  name: z.string().describe('Display name of the access group'),
  dataroomId: z.string().describe('ID of the associated dataroom'),
  createdAt: z.string().describe('When the access group was created'),
  updatedAt: z.string().describe('When the access group was last updated')
});

export let listAccessGroups = SlateTool.create(spec, {
  name: 'List Access Groups',
  key: 'list_access_groups',
  description: `Retrieve all access groups configured in your Trust Center. Access groups control which documents and content specific connections can see. Use these IDs when granting authorizations or managing document access.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accessGroups: z.array(accessGroupSchema).describe('List of access groups'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listAccessGroups();
    let accessGroups = (data.access_groups || []).map((g: any) => ({
      accessGroupId: g.id,
      name: g.name,
      dataroomId: g.dataroom_id,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    }));

    return {
      output: {
        accessGroups,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages
      },
      message: `Found **${accessGroups.length}** access groups.`
    };
  })
  .build();
