import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageOrganization = SlateTool.create(spec, {
  name: 'Manage Organization',
  key: 'manage_organization',
  description: `View and update organization details, list members, and manage sub-organizations. Sub-organizations represent physical sites, departments, or customer companies that group profiles and endpoints together.`,
  instructions: [
    'Use "get" to view organization info and resource counts.',
    'Use "list_members" to see organization team members and their roles.',
    'Use "list_sub_orgs" to list all sub-organizations.',
    'Use "create_sub_org" to create a new sub-organization.',
    'Use "update" to modify the organization settings.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['get', 'update', 'list_members', 'list_sub_orgs', 'create_sub_org'])
        .describe('Operation to perform'),
      name: z.string().optional().describe('Organization or sub-organization name'),
      contactEmail: z.string().optional().describe('Primary contact email'),
      contactName: z.string().optional().describe('Contact person name'),
      contactPhone: z.string().optional().describe('Contact phone number'),
      website: z.string().optional().describe('Organization website URL'),
      address: z.string().optional().describe('Physical address'),
      twofaRequired: z.boolean().optional().describe('Require 2FA for sub-org members'),
      statsEndpoint: z.string().optional().describe('Analytics storage region PK'),
      parentProfile: z
        .string()
        .optional()
        .describe('Global profile ID to enforce on sub-org devices')
    })
  )
  .output(
    z.object({
      organization: z
        .object({
          organizationId: z.string().describe('Organization ID'),
          name: z.string().describe('Organization name'),
          contactEmail: z.string().describe('Contact email'),
          website: z.string().describe('Website URL'),
          status: z.number().describe('Organization status'),
          maxProfiles: z.number().describe('Maximum profiles allowed'),
          maxUsers: z.number().describe('Maximum user devices allowed'),
          maxRouters: z.number().describe('Maximum routers allowed')
        })
        .optional(),
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member ID'),
            email: z.string().describe('Member email'),
            role: z.string().describe('Permission level (e.g., Owner, Admin)'),
            lastActive: z.number().describe('Last active timestamp'),
            twofa: z.boolean().describe('Whether 2FA is enabled')
          })
        )
        .optional(),
      subOrganizations: z
        .array(
          z.object({
            subOrgId: z.string().describe('Sub-organization ID'),
            name: z.string().describe('Sub-organization name'),
            contactEmail: z.string().describe('Contact email'),
            status: z.number().describe('Status'),
            maxProfiles: z.number().describe('Maximum profiles'),
            maxUsers: z.number().describe('Maximum user devices'),
            maxRouters: z.number().describe('Maximum routers')
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      operation,
      name,
      contactEmail,
      contactName,
      contactPhone,
      website,
      address,
      twofaRequired,
      statsEndpoint,
      parentProfile
    } = ctx.input;

    if (operation === 'list_members') {
      let members = await client.listMembers();
      return {
        output: {
          members: members.map(m => ({
            memberId: m.PK,
            email: m.email,
            role: m.permission.printable,
            lastActive: m.last_active,
            twofa: m.twofa === 1
          }))
        },
        message: `Found **${members.length}** organization member(s).`
      };
    }

    if (operation === 'list_sub_orgs') {
      let subOrgs = await client.listSubOrganizations();
      return {
        output: {
          subOrganizations: subOrgs.map(s => ({
            subOrgId: s.PK,
            name: s.name,
            contactEmail: s.contact_email,
            status: s.status,
            maxProfiles: s.max_profiles,
            maxUsers: s.max_users,
            maxRouters: s.max_routers
          }))
        },
        message: `Found **${subOrgs.length}** sub-organization(s).`
      };
    }

    if (operation === 'create_sub_org') {
      if (!name) throw new Error('name is required for create_sub_org');
      if (!contactEmail) throw new Error('contactEmail is required for create_sub_org');
      if (!statsEndpoint) throw new Error('statsEndpoint is required for create_sub_org');

      let subOrg = await client.createSubOrganization({
        name,
        contactEmail,
        twofaReq: twofaRequired ? 1 : 0,
        statsEndpoint,
        address,
        website,
        contactName,
        contactPhone,
        parentProfile
      });

      return {
        output: {
          subOrganizations: [
            {
              subOrgId: subOrg.PK,
              name: subOrg.name,
              contactEmail: subOrg.contact_email,
              status: subOrg.status,
              maxProfiles: subOrg.max_profiles,
              maxUsers: subOrg.max_users,
              maxRouters: subOrg.max_routers
            }
          ]
        },
        message: `Created sub-organization **${subOrg.name}** (${subOrg.PK}).`
      };
    }

    if (operation === 'update') {
      let org = await client.modifyOrganization({
        name,
        contactEmail,
        contactName,
        contactPhone,
        website,
        address,
        twofaReq: twofaRequired !== undefined ? (twofaRequired ? 1 : 0) : undefined,
        statsEndpoint
      });

      return {
        output: {
          organization: {
            organizationId: org.PK,
            name: org.name,
            contactEmail: org.contact_email,
            website: org.website || '',
            status: org.status,
            maxProfiles: org.max_profiles,
            maxUsers: org.max_users,
            maxRouters: org.max_routers
          }
        },
        message: `Updated organization **${org.name}**.`
      };
    }

    // get
    let org = await client.getOrganization();
    return {
      output: {
        organization: {
          organizationId: org.PK,
          name: org.name,
          contactEmail: org.contact_email,
          website: org.website || '',
          status: org.status,
          maxProfiles: org.max_profiles,
          maxUsers: org.max_users,
          maxRouters: org.max_routers
        }
      },
      message: `Organization: **${org.name}** (${org.PK}).`
    };
  })
  .build();
