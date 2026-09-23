import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatSectionItemName,
  resolveGoogleChatSectionName,
  resolveGoogleChatSpaceName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

type GoogleChatSection = {
  name?: string;
  displayName?: string;
  sortOrder?: number;
  type?: string;
};

type GoogleChatSectionItem = {
  name?: string;
  space?: string;
};

let sectionOutputSchema = z.object({
  sectionName: z.string().describe('Section resource name, users/{user}/sections/{section}'),
  displayName: z
    .string()
    .optional()
    .describe('Section display name; only set for custom sections'),
  sortOrder: z.number().int().optional().describe('Position of the section in the sidebar'),
  type: z
    .string()
    .optional()
    .describe(
      'Section type: CUSTOM_SECTION, DEFAULT_DIRECT_MESSAGES, DEFAULT_SPACES, or DEFAULT_APPS'
    )
});

let sectionItemOutputSchema = z.object({
  itemName: z
    .string()
    .describe('Section item resource name, users/{user}/sections/{section}/items/{item}'),
  sectionName: z.string().optional().describe('Section that contains the item'),
  space: z.string().optional().describe('Space resource name the item represents')
});

let mapSection = (section: GoogleChatSection) => {
  let sectionName = section.name?.trim();
  if (!sectionName) {
    throw googleChatValidationError(
      'Google Chat returned a section without its required resource name.'
    );
  }
  return {
    sectionName,
    displayName: section.displayName,
    sortOrder: section.sortOrder,
    type: section.type
  };
};

let mapSectionItem = (item: GoogleChatSectionItem) => {
  let itemName = item.name?.trim();
  if (!itemName) {
    throw googleChatValidationError(
      'Google Chat returned a section item without its required resource name.'
    );
  }
  return {
    itemName,
    sectionName: itemName.match(/^(users\/[^/]+\/sections\/[^/]+)\/items\//)?.[1],
    space: item.space
  };
};

let sectionInput = (description: string) => z.string().trim().min(1).describe(description);

let pageSizeInput = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Maximum results per page (1-100, default 10)');

let pageTokenInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Token for the next page; reuse the same other inputs');

let sectionConstraints = [
  "Reads and changes only the signed-in user's own Google Chat sidebar."
];

export let listSections = SlateTool.create(spec, {
  name: 'List Sections',
  key: 'list_sections',
  description:
    "List the signed-in user's Google Chat sidebar sections, including custom sections and the default Direct messages, Spaces, and Apps sections.",
  constraints: sectionConstraints,
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.listSections)
  .authMethods(googleChatActionAuthMethods.listSections)
  .input(
    z.object({
      pageSize: pageSizeInput,
      pageToken: pageTokenInput
    })
  )
  .output(
    z.object({
      sections: z.array(sectionOutputSchema).describe('Sidebar sections'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<{
      sections?: GoogleChatSection[];
      nextPageToken?: string;
    }>('users/me/sections', {
      method: 'get',
      params: pickDefined({
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      }),
      operation: 'list sections'
    });
    let sections = (response.sections ?? []).map(mapSection);

    return {
      output: {
        sections,
        nextPageToken: response.nextPageToken || undefined
      },
      message: `Found **${sections.length}** section(s).`
    };
  })
  .build();

export let listSectionItems = SlateTool.create(spec, {
  name: 'List Section Items',
  key: 'list_section_items',
  description:
    "List the conversations (spaces) in one of the signed-in user's Google Chat sidebar sections, or find which section holds a given space.",
  instructions: [
    'Call list_sections to discover section names.',
    'To find the section that holds a space, pass only space; the tool searches across all sections.'
  ],
  constraints: sectionConstraints,
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.listSectionItems)
  .authMethods(googleChatActionAuthMethods.listSectionItems)
  .input(
    z.object({
      section: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Section ID or users/{user}/sections/{section} name; call list_sections to discover sections. Omit, or pass "-", with space to search every section.'
        ),
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Only return the item for this space (space ID or spaces/{space})'),
      pageSize: pageSizeInput,
      pageToken: pageTokenInput
    })
  )
  .output(
    z.object({
      sectionName: z.string().describe('Section that was listed ("-" means all sections)'),
      items: z.array(sectionItemOutputSchema).describe('Section items'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let spaceName = ctx.input.space ? resolveGoogleChatSpaceName(ctx.input.space) : undefined;
    if (!ctx.input.section && !spaceName) {
      throw googleChatValidationError(
        'Provide section to list its items, or space to find the section that holds it.'
      );
    }
    let sectionName = resolveGoogleChatSectionName(ctx.input.section ?? '-');
    if (sectionName.endsWith('/sections/-') && !spaceName) {
      throw googleChatValidationError(
        'The "-" section wildcard can only be used together with space.'
      );
    }

    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<{
      sectionItems?: GoogleChatSectionItem[];
      nextPageToken?: string;
    }>(`${sectionName}/items`, {
      method: 'get',
      params: pickDefined({
        filter: spaceName ? `space = ${spaceName}` : undefined,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      }),
      operation: 'list section items'
    });
    let items = (response.sectionItems ?? []).map(mapSectionItem);

    return {
      output: {
        sectionName,
        items,
        nextPageToken: response.nextPageToken || undefined
      },
      message: `Found **${items.length}** item(s) in \`${sectionName}\`.`
    };
  })
  .build();

let manageSectionActions = ['create', 'update', 'delete', 'reposition'] as const;

export let manageSection = SlateTool.create(spec, {
  name: 'Manage Section',
  key: 'manage_section',
  description:
    "Create, rename, reorder, or delete custom sections in the signed-in user's Google Chat sidebar.",
  instructions: [
    'Use **action** "create" with **displayName** to add a custom section.',
    'Use **action** "update" with **section** and **displayName** to rename a custom section.',
    'Use **action** "reposition" with **section** and either **sortOrder** (1-based absolute position) or **relativePosition** (START or END).',
    'Use **action** "delete" with **section** to remove a custom section. Spaces in it move back to the default sections; nothing is deleted.'
  ],
  constraints: [
    ...sectionConstraints,
    'Only custom sections can be renamed or deleted; the default Direct messages, Spaces, and Apps sections are read-only.',
    'Display names are limited to 80 characters.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.manageSection)
  .authMethods(googleChatActionAuthMethods.manageSection)
  .input(
    z.object({
      action: z.enum(manageSectionActions).describe('Section operation to perform'),
      section: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Section ID or users/{user}/sections/{section} name; required for update, reposition, and delete. Call list_sections to discover sections.'
        ),
      displayName: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .optional()
        .describe('Section display name for create and update'),
      sortOrder: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Absolute 1-based sidebar position for reposition'),
      relativePosition: z
        .enum(['START', 'END'])
        .optional()
        .describe('Move the section to the start or end of the sidebar for reposition')
    })
  )
  .output(
    z.object({
      action: z.enum(manageSectionActions).describe('Completed operation'),
      sectionName: z.string().describe('Section resource name'),
      section: sectionOutputSchema.optional().describe('Section after the change'),
      deleted: z.boolean().optional().describe('True when the section was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let { action, displayName, sortOrder, relativePosition } = ctx.input;
    let client = new GoogleChatClient(ctx.auth.token);

    if (
      action !== 'reposition' &&
      (sortOrder !== undefined || relativePosition !== undefined)
    ) {
      throw googleChatValidationError(
        'sortOrder and relativePosition are supported only when action is reposition.'
      );
    }
    if ((action === 'delete' || action === 'reposition') && displayName !== undefined) {
      throw googleChatValidationError(
        `displayName is not supported when action is ${action}.`
      );
    }

    if (action === 'create') {
      if (ctx.input.section !== undefined) {
        throw googleChatValidationError('section is not supported when action is create.');
      }
      if (!displayName) {
        throw googleChatValidationError('displayName is required when action is create.');
      }
      let created = mapSection(
        await client.request<GoogleChatSection>('users/me/sections', {
          method: 'post',
          data: { displayName, type: 'CUSTOM_SECTION' },
          operation: 'create section'
        })
      );
      return {
        output: { action, sectionName: created.sectionName, section: created },
        message: `Created section **${created.displayName ?? displayName}** (\`${created.sectionName}\`).`
      };
    }

    let sectionName = resolveGoogleChatSectionName(ctx.input.section);
    if (sectionName.endsWith('/sections/-')) {
      throw googleChatValidationError('Pass a specific section, not the "-" wildcard.');
    }

    if (action === 'update') {
      if (!displayName) {
        throw googleChatValidationError('displayName is required when action is update.');
      }
      let updated = mapSection(
        await client.request<GoogleChatSection>(sectionName, {
          method: 'patch',
          params: { updateMask: 'displayName' },
          data: { displayName },
          operation: 'update section'
        })
      );
      return {
        output: { action, sectionName: updated.sectionName, section: updated },
        message: `Renamed section \`${updated.sectionName}\` to **${updated.displayName ?? displayName}**.`
      };
    }

    if (action === 'reposition') {
      if ((sortOrder === undefined) === (relativePosition === undefined)) {
        throw googleChatValidationError(
          'Provide exactly one of sortOrder or relativePosition when action is reposition.'
        );
      }
      let response = await client.request<{ section?: GoogleChatSection }>(
        `${sectionName}:position`,
        {
          method: 'post',
          data: sortOrder !== undefined ? { sortOrder } : { relativePosition },
          operation: 'reposition section'
        }
      );
      let section = response.section ? mapSection(response.section) : undefined;
      return {
        output: { action, sectionName: section?.sectionName ?? sectionName, section },
        message: `Moved section \`${sectionName}\` to ${
          sortOrder !== undefined
            ? `position ${sortOrder}`
            : `the ${relativePosition?.toLowerCase()}`
        }.`
      };
    }

    await client.request<Record<string, never>>(sectionName, {
      method: 'delete',
      operation: 'delete section'
    });
    return {
      output: { action, sectionName, deleted: true },
      message: `Deleted section \`${sectionName}\`; its spaces moved back to the default sections.`
    };
  })
  .build();

export let moveSectionItem = SlateTool.create(spec, {
  name: 'Move Section Item',
  key: 'move_section_item',
  description:
    "Move a conversation (section item) to a different section in the signed-in user's Google Chat sidebar.",
  instructions: [
    'Call list_section_items to find the item name; pass only space to locate the item for a given space.',
    'Call list_sections to find the target section.'
  ],
  constraints: sectionConstraints,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.moveSectionItem)
  .authMethods(googleChatActionAuthMethods.moveSectionItem)
  .input(
    z.object({
      item: sectionInput(
        'Section item name users/{user}/sections/{section}/items/{item}, or a bare item ID together with section'
      ),
      section: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Current section ID or name; required only when item is a bare ID'),
      targetSection: sectionInput(
        'Section ID or users/{user}/sections/{section} name to move the item into'
      )
    })
  )
  .output(
    z.object({
      item: sectionItemOutputSchema.describe('Section item after the move')
    })
  )
  .handleInvocation(async ctx => {
    let itemName = resolveGoogleChatSectionItemName(ctx.input.item, ctx.input.section);
    let targetSection = resolveGoogleChatSectionName(ctx.input.targetSection);
    if (targetSection.endsWith('/sections/-')) {
      throw googleChatValidationError('targetSection must be a specific section.');
    }

    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<{ sectionItem?: GoogleChatSectionItem }>(
      `${itemName}:move`,
      {
        method: 'post',
        data: { targetSection },
        operation: 'move section item'
      }
    );
    if (!response.sectionItem) {
      throw createApiServiceError(
        'Google Chat moved the section item but returned no sectionItem; call list_section_items to see its new name.',
        { reason: 'google_chat_unexpected_response' }
      );
    }
    let item = mapSectionItem(response.sectionItem);

    return {
      output: { item },
      message: `Moved \`${item.space ?? itemName}\` to section \`${targetSection}\`.`
    };
  })
  .build();
