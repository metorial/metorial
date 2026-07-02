import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pinterestServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBoardSection = SlateTool.create(spec, {
  name: 'Manage Board Section',
  key: 'manage_board_section',
  description: `Create, update, delete, or list sections within a Pinterest board. Board sections help organize pins into subcategories within a board.`,
  instructions: [
    'To list sections, set action to "list" and provide the boardId.',
    'To create a section, set action to "create" and provide boardId and name.',
    'To update a section name, set action to "update" and provide boardId, sectionId, and name.',
    'To delete a section, set action to "delete" and provide boardId and sectionId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      boardId: z.string().describe('ID of the board'),
      sectionId: z.string().optional().describe('Section ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Name of the section (required for create and update)'),
      bookmark: z.string().optional().describe('Pagination bookmark (for list action)'),
      pageSize: z.number().optional().describe('Number of sections per page (for list action)')
    })
  )
  .output(
    z.object({
      sections: z
        .array(
          z.object({
            sectionId: z.string().describe('ID of the section'),
            name: z.string().optional().describe('Name of the section')
          })
        )
        .optional()
        .describe('List of board sections (for list action)'),
      sectionId: z.string().optional().describe('ID of the section (for create/update)'),
      name: z.string().optional().describe('Name of the section (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the section was deleted'),
      bookmark: z.string().optional().describe('Pagination bookmark')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listBoardSections(ctx.input.boardId, {
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });

      let sections = (result.items || []).map((section: any) => ({
        sectionId: section.id,
        name: section.name
      }));

      return {
        output: {
          sections,
          bookmark: result.bookmark ?? undefined
        },
        message: `Found **${sections.length}** section(s) on board.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw pinterestServiceError('Section name is required for create action');
      }
      let result = await client.createBoardSection(ctx.input.boardId, ctx.input.name);

      return {
        output: {
          sectionId: result.id,
          name: result.name
        },
        message: `Created board section **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.sectionId || !ctx.input.name) {
        throw pinterestServiceError('Section ID and name are required for update action');
      }
      let result = await client.updateBoardSection(
        ctx.input.boardId,
        ctx.input.sectionId,
        ctx.input.name
      );

      return {
        output: {
          sectionId: result.id,
          name: result.name
        },
        message: `Updated board section to **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.sectionId) {
        throw pinterestServiceError('Section ID is required for delete action');
      }
      await client.deleteBoardSection(ctx.input.boardId, ctx.input.sectionId);

      return {
        output: {
          deleted: true
        },
        message: `Deleted board section **${ctx.input.sectionId}**.`
      };
    }

    throw pinterestServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
