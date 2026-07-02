import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageOrgUnits = SlateTool.create(spec, {
  name: 'Manage Org Units',
  key: 'manage_org_units',
  description: `List, create, update, or delete organizational units (OUs) in the Google Workspace hierarchy. OUs are used to apply policies and configurations to subsets of users and devices.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageOrgUnits)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      orgUnitPath: z
        .string()
        .optional()
        .describe(
          'Full path of the org unit (e.g. /Engineering/Backend). Required for get, update, delete.'
        ),
      name: z.string().optional().describe('Name for the org unit (required for create)'),
      parentOrgUnitPath: z
        .string()
        .optional()
        .describe('Parent org unit path (for create, defaults to /)'),
      description: z.string().optional().describe('Description of the org unit'),
      listType: z
        .enum(['all', 'children', 'allIncludingParent'])
        .optional()
        .describe(
          'Type of listing: all OUs, direct children only, or all including parent. Defaults to all.'
        )
    })
  )
  .output(
    z.object({
      orgUnits: z
        .array(
          z.object({
            orgUnitId: z.string().optional(),
            name: z.string().optional(),
            orgUnitPath: z.string().optional(),
            parentOrgUnitPath: z.string().optional(),
            description: z.string().optional(),
            parentOrgUnitId: z.string().optional()
          })
        )
        .optional(),
      orgUnit: z
        .object({
          orgUnitId: z.string().optional(),
          name: z.string().optional(),
          orgUnitPath: z.string().optional(),
          parentOrgUnitPath: z.string().optional(),
          description: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listOrgUnits({
        orgUnitPath: ctx.input.orgUnitPath,
        type: ctx.input.listType
      });

      let orgUnits = (result.organizationUnits || []).map((ou: any) => ({
        orgUnitId: ou.orgUnitId,
        name: ou.name,
        orgUnitPath: ou.orgUnitPath,
        parentOrgUnitPath: ou.parentOrgUnitPath,
        description: ou.description,
        parentOrgUnitId: ou.parentOrgUnitId
      }));

      return {
        output: { orgUnits, action: 'list' },
        message: `Found **${orgUnits.length}** organizational units.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.orgUnitPath) throw new Error('orgUnitPath is required for get action');
      let ou = await client.getOrgUnit(ctx.input.orgUnitPath);
      return {
        output: {
          orgUnit: {
            orgUnitId: ou.orgUnitId,
            name: ou.name,
            orgUnitPath: ou.orgUnitPath,
            parentOrgUnitPath: ou.parentOrgUnitPath,
            description: ou.description
          },
          action: 'get'
        },
        message: `Retrieved org unit **${ou.name}** at path "${ou.orgUnitPath}".`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create an org unit');
      let ou = await client.createOrgUnit({
        name: ctx.input.name,
        parentOrgUnitPath: ctx.input.parentOrgUnitPath || '/',
        description: ctx.input.description
      });
      return {
        output: {
          orgUnit: {
            orgUnitId: ou.orgUnitId,
            name: ou.name,
            orgUnitPath: ou.orgUnitPath,
            parentOrgUnitPath: ou.parentOrgUnitPath,
            description: ou.description
          },
          action: 'create'
        },
        message: `Created org unit **${ou.name}** at "${ou.orgUnitPath}".`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.orgUnitPath) throw new Error('orgUnitPath is required for update');
      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.parentOrgUnitPath)
        updateData.parentOrgUnitPath = ctx.input.parentOrgUnitPath;

      let ou = await client.updateOrgUnit(ctx.input.orgUnitPath, updateData);
      return {
        output: {
          orgUnit: {
            orgUnitId: ou.orgUnitId,
            name: ou.name,
            orgUnitPath: ou.orgUnitPath,
            parentOrgUnitPath: ou.parentOrgUnitPath,
            description: ou.description
          },
          action: 'update'
        },
        message: `Updated org unit **${ou.name}**.`
      };
    }

    // delete
    if (!ctx.input.orgUnitPath) throw new Error('orgUnitPath is required for delete');
    await client.deleteOrgUnit(ctx.input.orgUnitPath);
    return {
      output: { deleted: true, action: 'delete' },
      message: `Deleted org unit at path **${ctx.input.orgUnitPath}**.`
    };
  })
  .build();
