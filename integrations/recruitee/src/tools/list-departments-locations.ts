import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let listDepartmentsLocations = SlateTool.create(spec, {
  name: 'List Departments & Locations',
  key: 'list_departments_locations',
  description: `Retrieve all departments and office locations configured in the Recruitee account. Useful for finding department and location IDs when creating or updating job offers.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      departments: z
        .array(
          z.object({
            departmentId: z.number().describe('Department ID'),
            name: z.string().describe('Department name')
          })
        )
        .describe('All departments'),
      locations: z
        .array(
          z.object({
            locationId: z.number().describe('Location ID'),
            fullAddress: z.string().describe('Full address'),
            countryCode: z.string().nullable().describe('Country code (e.g., NL, US)'),
            stateCode: z.string().nullable().describe('State/province code')
          })
        )
        .describe('All office locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let [deptResult, locResult] = await Promise.all([
      client.listDepartments(),
      client.listLocations()
    ]);

    let departments = deptResult.departments || [];
    let locations = locResult.locations || [];

    return {
      output: {
        departments: departments.map((d: any) => ({
          departmentId: d.id,
          name: d.name
        })),
        locations: locations.map((l: any) => ({
          locationId: l.id,
          fullAddress: l.full_address || '',
          countryCode: l.country_code || null,
          stateCode: l.state_code || null
        }))
      },
      message: `Found ${departments.length} departments and ${locations.length} locations.`
    };
  })
  .build();
