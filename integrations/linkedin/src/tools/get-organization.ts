import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve LinkedIn organization (company page) details by ID or vanity name. Returns organization name, description, website, type, and other metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().optional().describe('Numeric ID of the organization'),
      vanityName: z.string().optional().describe('Vanity name (URL slug) of the organization')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('Numeric ID of the organization'),
      name: z.string().describe('Localized name of the organization'),
      vanityName: z.string().optional().describe('Vanity name (URL slug)'),
      description: z.string().optional().describe('Localized description'),
      website: z.string().optional().describe('Organization website URL'),
      organizationType: z.string().optional().describe('Type of organization'),
      staffCountRange: z.string().optional().describe('Employee count range'),
      industries: z.array(z.string()).optional().describe('Industry URNs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });

    if (!ctx.input.organizationId && !ctx.input.vanityName) {
      throw new Error('Either organizationId or vanityName must be provided');
    }

    let org: any;
    if (ctx.input.organizationId) {
      org = await client.getOrganization(ctx.input.organizationId);
    } else {
      org = await client.getOrganizationByVanityName(ctx.input.vanityName!);
    }

    return {
      output: {
        organizationId: org.id,
        name: org.localizedName,
        vanityName: org.vanityName,
        description: org.localizedDescription,
        website: org.localizedWebsite,
        organizationType: org.organizationType,
        staffCountRange: org.staffCountRange,
        industries: org.industries
      },
      message: `Retrieved organization **${org.localizedName}**${org.vanityName ? ` (${org.vanityName})` : ''}.`
    };
  })
  .build();

export let listAdministeredOrganizations = SlateTool.create(spec, {
  name: 'List Administered Organizations',
  key: 'list_administered_organizations',
  description: `List all LinkedIn organizations (company pages) where the authenticated member has administrator access. Useful for finding organizations the user can post on behalf of.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationUrn: z.string().describe('URN of the organization'),
          role: z.string().describe('Admin role type'),
          state: z.string().describe('Role state'),
          name: z.string().optional().describe('Localized name of the organization'),
          vanityName: z.string().optional().describe('Vanity name (URL slug)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });

    let userInfo = await client.getUserInfo();
    let memberUrn = `urn:li:person:${userInfo.sub}`;
    let roles = await client.getAdministeredOrganizations(memberUrn);

    let organizations = roles.map(r => ({
      organizationUrn: r.organizationTarget,
      role: r.role,
      state: r.state,
      name: r['organizationTarget~']?.localizedName,
      vanityName: r['organizationTarget~']?.vanityName
    }));

    return {
      output: { organizations },
      message: `Found **${organizations.length}** administered organization(s).`
    };
  })
  .build();
