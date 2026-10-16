import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassMarkerClient } from '../lib/client';
import { optionalNumber, readNumber } from '../lib/validation';
import { spec } from '../spec';

let assignedTestSchema = z.object({
  testId: z.number().describe('Unique identifier of the test'),
  testName: z.string().describe('Name of the test')
});

let groupSchema = z.object({
  groupId: z.number().describe('Unique identifier of the group'),
  groupName: z.string().describe('Name of the group'),
  assignedTests: z.array(assignedTestSchema).describe('Tests assigned to this group')
});

let linkSchema = z.object({
  linkId: z.number().describe('Unique identifier of the link'),
  linkName: z.string().describe('Name of the link'),
  linkUrlId: z.string().optional().describe('URL identifier, when enabled for the API key'),
  accessListId: z
    .number()
    .optional()
    .describe('ID of the access list, when assigned to this link'),
  assignedTests: z.array(assignedTestSchema).describe('Tests assigned to this link')
});

export let listGroupsAndLinks = SlateTool.create(spec, {
  name: 'List Groups & Links',
  key: 'list_groups_and_links',
  description: `Retrieve all groups, links, and their assigned tests that your API key has permission to access. Use this to discover available exams and obtain the IDs needed for retrieving results or managing access.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(groupSchema).describe('List of groups with their assigned tests'),
      links: z.array(linkSchema).describe('List of links with their assigned tests'),
      response: z.any().describe('Complete ClassMarker response, including provider metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassMarkerClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let data = await client.getGroupsLinksTests();

    let groups = (data.groups || []).map((entry: any) => {
      let g = entry.group ?? entry;
      return {
        groupId: readNumber(g.group_id, 'group_id'),
        groupName: g.group_name,
        assignedTests: (g.assigned_tests || []).map((entry: any) => {
          let t = entry.test ?? entry;
          return { testId: readNumber(t.test_id, 'test_id'), testName: t.test_name };
        })
      };
    });

    let links = (data.links || []).map((entry: any) => {
      let l = entry.link ?? entry;
      return {
        linkId: readNumber(l.link_id, 'link_id'),
        linkName: l.link_name,
        linkUrlId: l.link_url_id ?? undefined,
        accessListId: optionalNumber(l.access_list_id, 'access_list_id'),
        assignedTests: (l.assigned_tests || []).map((entry: any) => {
          let t = entry.test ?? entry;
          return { testId: readNumber(t.test_id, 'test_id'), testName: t.test_name };
        })
      };
    });

    return {
      output: { groups, links, response: data },
      message: `Found **${groups.length}** group(s) and **${links.length}** link(s).`
    };
  })
  .build();
