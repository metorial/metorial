import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lead Lists',
  key: 'list_lead_lists',
  description: `Retrieve all lead and company lists from your HeyReach account. Lists serve as containers for organizing leads before or during campaign assignment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Number of lists to return (default: 50)'),
      offset: z.number().optional().default(0).describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      lists: z.array(z.any()).describe('Array of lead/company list objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAllLists(ctx.input.limit, ctx.input.offset);
    let lists = Array.isArray(result) ? result : (result?.data ?? result?.items ?? []);

    return {
      output: { lists },
      message: `Retrieved **${lists.length}** list(s).`
    };
  })
  .build();

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Create a new empty lead or company list in HeyReach. Lists can be used to organize leads before adding them to campaigns.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new list'),
      listType: z
        .enum(['USER_LIST', 'COMPANY_LIST'])
        .optional()
        .default('USER_LIST')
        .describe('Type of list to create: USER_LIST for leads, COMPANY_LIST for companies')
    })
  )
  .output(
    z.object({
      list: z.any().describe('The newly created list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createEmptyList(ctx.input.name, ctx.input.listType);
    let list = result?.data ?? result;

    return {
      output: { list },
      message: `Created new **${ctx.input.listType === 'COMPANY_LIST' ? 'company' : 'lead'}** list: **${ctx.input.name}**.`
    };
  })
  .build();
