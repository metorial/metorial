import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orgItemSchema = z.object({
  itemId: z.number().describe('Item ID'),
  name: z.string().describe('Item name')
});

export let listOrganizationalStructure = SlateTool.create(spec, {
  name: 'List Organizational Structure',
  key: 'list_organizational_structure',
  description: `Retrieve organizational structure data from TalentHR including departments, divisions, job titles, locations, and employment statuses.
Select which types to include in the response. Useful for discovering available IDs when creating or updating employees.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeDepartments: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include departments in the response'),
      includeDivisions: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include divisions in the response'),
      includeJobTitles: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include job titles in the response'),
      includeLocations: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include locations in the response'),
      includeEmploymentStatuses: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include employment statuses in the response')
    })
  )
  .output(
    z.object({
      departments: z.array(orgItemSchema).optional().describe('List of departments'),
      divisions: z.array(orgItemSchema).optional().describe('List of divisions'),
      jobTitles: z.array(orgItemSchema).optional().describe('List of job titles'),
      locations: z.array(orgItemSchema).optional().describe('List of locations'),
      employmentStatuses: z
        .array(orgItemSchema)
        .optional()
        .describe('List of employment statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: Record<string, any> = {};
    let summaryParts: string[] = [];

    if (ctx.input.includeDepartments) {
      let resp = await client.listDepartments();
      result.departments = resp.data.map(d => ({ itemId: d.id, name: d.name }));
      summaryParts.push(`${result.departments.length} department(s)`);
    }

    if (ctx.input.includeDivisions) {
      let resp = await client.listDivisions();
      result.divisions = resp.data.map(d => ({ itemId: d.id, name: d.name }));
      summaryParts.push(`${result.divisions.length} division(s)`);
    }

    if (ctx.input.includeJobTitles) {
      let resp = await client.listJobTitles();
      result.jobTitles = resp.data.map(d => ({ itemId: d.id, name: d.name }));
      summaryParts.push(`${result.jobTitles.length} job title(s)`);
    }

    if (ctx.input.includeLocations) {
      let resp = await client.listLocations();
      result.locations = resp.data.map(d => ({ itemId: d.id, name: d.name }));
      summaryParts.push(`${result.locations.length} location(s)`);
    }

    if (ctx.input.includeEmploymentStatuses) {
      let resp = await client.listEmploymentStatuses();
      result.employmentStatuses = resp.data.map(d => ({ itemId: d.id, name: d.name }));
      summaryParts.push(`${result.employmentStatuses.length} employment status(es)`);
    }

    return {
      output: result as any,
      message: `Retrieved ${summaryParts.join(', ')}.`
    };
  })
  .build();
