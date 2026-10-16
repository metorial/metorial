import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, inputId, requiredText } from '../lib/client';
import { groupOutput, mapGroup, pageInput, pageOutput } from '../lib/schemas';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description:
    'List recipient groups and their member counts. Use the returned group IDs when scheduling postcards or managing contact memberships.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...pageInput,
      sort: z.enum(['name', 'created_at', 'updated_at']).optional().describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(z.object({ groups: z.array(groupOutput), ...pageOutput }))
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).list('/groups', {
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      sort: ctx.input.sort,
      direction: ctx.input.direction
    });
    return {
      output: {
        groups: result.items.map(mapGroup),
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        links: result.links
      },
      message: `Found ${result.items.length} recipient group(s) on this page.`
    };
  })
  .build();

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description:
    'Read one recipient group, including its name, external reference, and recipient count.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ groupId: z.string().describe('Recipient group ID') }))
  .output(groupOutput)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).get(
      `/groups/${inputId(ctx.input.groupId, 'groupId')}`
    );
    return { output: mapGroup(result), message: 'Retrieved recipient group.' };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description:
    'Create an empty recipient group. Add contacts using the groupIds or groupNames fields on Create Contact or Update Contact.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Recipient group name'),
      externalId: z.string().optional().describe('Reference in your external system')
    })
  )
  .output(groupOutput)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).save(
      'POST',
      '/groups',
      pickDefined({
        name: requiredText(ctx.input.name, 'name'),
        external_id: ctx.input.externalId
      })
    );
    return { output: mapGroup(result), message: 'Created recipient group.' };
  })
  .build();

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description:
    'Rename a recipient group or update its external reference. Omitted fields stay unchanged.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      groupId: z.string().describe('Recipient group ID'),
      name: z.string().optional().describe('New group name'),
      externalId: z.string().optional().describe('New reference in your external system')
    })
  )
  .output(groupOutput)
  .handleInvocation(async ctx => {
    let body = pickDefined({
      name: ctx.input.name === undefined ? undefined : requiredText(ctx.input.name, 'name'),
      external_id: ctx.input.externalId
    });
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide name or externalId to update.');
    let result = await new Client({ token: ctx.auth.token }).save(
      'PATCH',
      `/groups/${inputId(ctx.input.groupId, 'groupId')}`,
      body
    );
    return { output: mapGroup(result), message: 'Updated recipient group.' };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description:
    'Delete a recipient group. EchtPost rejects groups that still have members or are in use; remove memberships before retrying.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ groupId: z.string().describe('Recipient group ID to delete') }))
  .output(z.object({ groupId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).remove(
      `/groups/${inputId(ctx.input.groupId, 'groupId')}`
    );
    return {
      output: { groupId: ctx.input.groupId, deleted: true },
      message: 'Recipient group deleted.'
    };
  })
  .build();
