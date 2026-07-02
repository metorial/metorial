import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

let workdayReferenceSchema = z.object({
  id: z.string().optional().describe('Workday ID'),
  descriptor: z.string().optional().describe('Display name'),
  href: z.string().optional().describe('API href')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Supervisory Organizations',
  key: 'list_organizations',
  description: `Retrieve a list of supervisory organizations in Workday. Supervisory organizations represent the management hierarchy and team structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization ID'),
            descriptor: z.string().optional().describe('Organization name'),
            href: z.string().optional().describe('API href')
          })
        )
        .describe('List of supervisory organizations'),
      total: z.number().describe('Total number of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.listSupervisoryOrganizations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let organizations = result.data.map(o => ({
      organizationId: o.id,
      descriptor: o.descriptor,
      href: o.href
    }));

    return {
      output: { organizations, total: result.total },
      message: `Retrieved **${result.total}** supervisory organizations. Returned ${organizations.length} results.`
    };
  })
  .build();

export let getOrganizationWorkers = SlateTool.create(spec, {
  name: 'Get Organization Workers',
  key: 'get_organization_workers',
  description: `Retrieve the list of workers within a specific supervisory organization. Useful for finding all team members under a given manager or department.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('The supervisory organization ID'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      workers: z
        .array(
          z.object({
            workerId: z.string().describe('Worker ID'),
            displayName: z.string().describe('Worker display name'),
            href: z.string().optional().describe('API href'),
            primaryWorkEmail: z.string().optional().describe('Primary work email'),
            businessTitle: z.string().optional().describe('Business title'),
            supervisoryOrganization: workdayReferenceSchema
              .optional()
              .describe('Supervisory organization reference')
          })
        )
        .describe('Workers in the organization'),
      total: z.number().describe('Total number of workers in the organization')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.getOrganizationWorkers(ctx.input.organizationId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let workers = result.data.map(w => ({
      workerId: w.id,
      displayName: w.descriptor,
      href: w.href,
      primaryWorkEmail: w.primaryWorkEmail,
      businessTitle: w.businessTitle,
      supervisoryOrganization: w.primarySupervisoryOrganization
    }));

    return {
      output: { workers, total: result.total },
      message: `Found **${result.total}** workers in organization ${ctx.input.organizationId}. Returned ${workers.length} results.`
    };
  })
  .build();
