import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFamilies = SlateTool.create(spec, {
  name: 'List Families',
  key: 'list_families',
  description: `Retrieve families from ChMeetings. Supports searching by name and pagination. Also retrieves available family roles when needed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z.string().optional().describe('Search families by name'),
      includeRoles: z
        .boolean()
        .optional()
        .describe('Also return the list of available family roles'),
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      families: z.array(z.record(z.string(), z.unknown())).describe('List of family records'),
      roles: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Available family roles (if requested)'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      total: z.number().describe('Total number of families')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFamilies({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      searchText: ctx.input.searchText
    });

    let roles: Record<string, unknown>[] | undefined;
    if (ctx.input.includeRoles) {
      let rolesResult = await client.getFamilyRoles();
      roles = rolesResult.data as unknown as Record<string, unknown>[];
    }

    return {
      output: {
        families: result.data as Record<string, unknown>[],
        roles,
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** family/families. Showing page ${result.page}.`
    };
  })
  .build();

export let getFamily = SlateTool.create(spec, {
  name: 'Get Family',
  key: 'get_family',
  description: `Retrieve a specific family by its ID, including all members and their roles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      familyId: z.number().describe('ID of the family to retrieve')
    })
  )
  .output(
    z.object({
      family: z.record(z.string(), z.unknown()).describe('Family record with members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getFamily(ctx.input.familyId);

    return {
      output: {
        family: result.data as Record<string, unknown>
      },
      message: `Retrieved family with ID **${ctx.input.familyId}**.`
    };
  })
  .build();

export let createFamily = SlateTool.create(spec, {
  name: 'Create Family',
  key: 'create_family',
  description: `Create a new family in ChMeetings. Requires at least 2 members. Each member is identified by their person ID and an optional role (Primary, Spouse, Child, Grandparent, Other).`
})
  .input(
    z.object({
      members: z
        .array(
          z.object({
            personId: z.number().describe('Person ID of the family member'),
            role: z
              .string()
              .optional()
              .describe('Family role: Primary, Spouse, Child, Grandparent, or Other')
          })
        )
        .min(2)
        .describe('Family members (minimum 2 required)')
    })
  )
  .output(
    z.object({
      family: z.record(z.string(), z.unknown()).describe('Created family record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createFamily({
      members: ctx.input.members.map(m => ({
        person_id: m.personId,
        role: m.role
      }))
    });

    return {
      output: {
        family: result.data as Record<string, unknown>
      },
      message: `Created family with **${ctx.input.members.length}** members.`
    };
  })
  .build();

export let deleteFamily = SlateTool.create(spec, {
  name: 'Delete Family',
  key: 'delete_family',
  description: `Delete a family record from ChMeetings. This removes the family structure but does not delete the individual person records.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      familyId: z.number().describe('ID of the family to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteFamily(ctx.input.familyId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted family with ID **${ctx.input.familyId}**.`
    };
  })
  .build();

export let manageFamilyMembers = SlateTool.create(spec, {
  name: 'Manage Family Members',
  key: 'manage_family_members',
  description: `Add, remove, or update members in an existing family. Use **action** to specify the operation:
- **add**: Add new members to the family
- **remove**: Remove a member from the family
- **updateRole**: Update a member's role within the family
- **replace**: Replace all family members (minimum 2 required)`
})
  .input(
    z.object({
      familyId: z.number().describe('ID of the family to modify'),
      action: z
        .enum(['add', 'remove', 'updateRole', 'replace'])
        .describe('Operation to perform'),
      members: z
        .array(
          z.object({
            personId: z.number().describe('Person ID'),
            role: z
              .string()
              .optional()
              .describe('Family role: Primary, Spouse, Child, Grandparent, or Other')
          })
        )
        .optional()
        .describe('Members to add or set (for add/replace actions)'),
      personId: z
        .number()
        .optional()
        .describe('Person ID to remove or update role (for remove/updateRole actions)'),
      role: z.string().optional().describe('New role (for updateRole action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      family: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated family record (if available)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let family: Record<string, unknown> | undefined;

    switch (ctx.input.action) {
      case 'add': {
        if (!ctx.input.members || ctx.input.members.length === 0) {
          throw new Error('Members are required for the add action');
        }
        let result = await client.addFamilyMembers(
          ctx.input.familyId,
          ctx.input.members.map(m => ({ person_id: m.personId, role: m.role }))
        );
        family = result.data as Record<string, unknown>;
        break;
      }
      case 'remove': {
        if (!ctx.input.personId) {
          throw new Error('personId is required for the remove action');
        }
        await client.removeFamilyMember(ctx.input.familyId, ctx.input.personId);
        break;
      }
      case 'updateRole': {
        if (!ctx.input.personId || !ctx.input.role) {
          throw new Error('personId and role are required for the updateRole action');
        }
        await client.updateFamilyMemberRole(
          ctx.input.familyId,
          ctx.input.personId,
          ctx.input.role
        );
        break;
      }
      case 'replace': {
        if (!ctx.input.members || ctx.input.members.length < 2) {
          throw new Error('At least 2 members are required for the replace action');
        }
        let result = await client.setFamilyMembers(
          ctx.input.familyId,
          ctx.input.members.map(m => ({ person_id: m.personId, role: m.role }))
        );
        family = result.data as Record<string, unknown>;
        break;
      }
    }

    return {
      output: {
        success: true,
        family
      },
      message: `Successfully performed **${ctx.input.action}** on family **${ctx.input.familyId}**.`
    };
  })
  .build();
