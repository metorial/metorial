import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listOrgUnits = SlateTool.create(spec, {
  name: 'List Org Units',
  key: 'list_org_units',
  description: `Search and list organizational units (courses, departments, semesters, etc.). Supports filtering by type, name, and code. Also supports listing children of a specific org unit.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      parentOrgUnitId: z
        .string()
        .optional()
        .describe('If provided, lists children of this org unit'),
      orgUnitType: z.string().optional().describe('Filter by org unit type ID'),
      orgUnitName: z.string().optional().describe('Filter by name (partial match)'),
      orgUnitCode: z.string().optional().describe('Filter by code'),
      bookmark: z.string().optional().describe('Pagination bookmark')
    })
  )
  .output(
    z.object({
      orgUnits: z
        .array(
          z.object({
            orgUnitId: z.string().describe('Org unit ID'),
            name: z.string().optional().describe('Org unit name'),
            code: z.string().optional().describe('Org unit code'),
            type: z
              .object({
                typeId: z.string().optional().describe('Type ID'),
                typeName: z.string().optional().describe('Type name')
              })
              .optional()
              .describe('Org unit type'),
            path: z.string().optional().describe('Org unit path')
          })
        )
        .describe('List of org units'),
      nextBookmark: z.string().optional().describe('Bookmark for the next page'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.parentOrgUnitId) {
      let result = await client.getOrgUnitChildren(ctx.input.parentOrgUnitId, {
        bookmark: ctx.input.bookmark
      });

      let items = result?.Items || (Array.isArray(result) ? result : []);
      let orgUnits = items.map((o: any) => ({
        orgUnitId: String(o.Identifier),
        name: o.Name,
        code: o.Code,
        type: o.Type
          ? {
              typeId: String(o.Type.Id),
              typeName: o.Type.Name
            }
          : undefined,
        path: o.Path
      }));

      return {
        output: {
          orgUnits,
          nextBookmark: result?.PagingInfo?.Bookmark || undefined,
          hasMore: result?.PagingInfo?.HasMoreItems || false
        },
        message: `Found **${orgUnits.length}** child org unit(s) for ${ctx.input.parentOrgUnitId}.`
      };
    }

    let result = await client.listOrgUnits({
      orgUnitType: ctx.input.orgUnitType,
      orgUnitName: ctx.input.orgUnitName,
      orgUnitCode: ctx.input.orgUnitCode,
      bookmark: ctx.input.bookmark
    });

    let items = result?.Items || (Array.isArray(result) ? result : []);
    let orgUnits = items.map((o: any) => ({
      orgUnitId: String(o.Identifier),
      name: o.Name,
      code: o.Code,
      type: o.Type
        ? {
            typeId: String(o.Type.Id),
            typeName: o.Type.Name
          }
        : undefined,
      path: o.Path
    }));

    return {
      output: {
        orgUnits,
        nextBookmark: result?.PagingInfo?.Bookmark || undefined,
        hasMore: result?.PagingInfo?.HasMoreItems || false
      },
      message: `Found **${orgUnits.length}** org unit(s).${result?.PagingInfo?.HasMoreItems ? ' More results available.' : ''}`
    };
  })
  .build();

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `List all available roles in the Brightspace instance. Use role IDs when creating users or managing enrollments.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      roles: z
        .array(
          z.object({
            roleId: z.string().describe('Role ID'),
            name: z.string().optional().describe('Role display name'),
            code: z.string().optional().describe('Role code')
          })
        )
        .describe('List of available roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listRoles();

    let items = Array.isArray(result) ? result : [];
    let roles = items.map((r: any) => ({
      roleId: String(r.Identifier),
      name: r.DisplayName || r.Name,
      code: r.Code
    }));

    return {
      output: { roles },
      message: `Found **${roles.length}** role(s).`
    };
  })
  .build();
