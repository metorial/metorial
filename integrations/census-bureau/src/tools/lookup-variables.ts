import { SlateTool } from 'slates';
import { z } from 'zod';
import { CensusDataClient } from '../lib/client';
import { spec } from '../spec';

let variableSchema = z.object({
  name: z.string().describe('Variable name to use in queries'),
  label: z.string().describe('Human-readable label'),
  concept: z.string().optional().describe('Concept or table the variable belongs to'),
  predicateType: z.string().optional().describe('Data type (int, float, string)'),
  group: z.string().optional().describe('Variable group identifier')
});

let groupSchema = z.object({
  groupId: z.string().describe('Group identifier (e.g., "B01001")'),
  groupName: z.string().describe('Human-readable group name'),
  variableCount: z.number().optional().describe('Number of variables in the group')
});

export let lookupVariables = SlateTool.create(spec, {
  name: 'Lookup Variables',
  key: 'lookup_variables',
  description: `Look up available variables and variable groups for a Census Bureau dataset. Returns variable names, labels, and metadata needed to construct data queries.

Use this to find the correct variable names before querying census data. You can list all variables, search by keyword, list variable groups (tables), or get all variables in a specific group.`,
  instructions: [
    'Use "Discover Datasets" first to find the dataset path and vintage.',
    'Variable groups correspond to Census tables (e.g., B01001 = Sex By Age).',
    'When querying a full group, use "group(B01001)" syntax in the variables list of the Query Census Data tool.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataset: z.string().describe('Dataset path (e.g., "acs/acs5", "dec/pl")'),
      vintage: z.string().optional().describe('Vintage year (e.g., "2022")'),
      keyword: z
        .string()
        .optional()
        .describe(
          'Search keyword to filter variables by label or concept (e.g., "population", "median income")'
        ),
      groupId: z
        .string()
        .optional()
        .describe('Specific group/table ID to get all variables for (e.g., "B01001")'),
      listGroups: z
        .boolean()
        .optional()
        .describe(
          'Set to true to list available variable groups/tables instead of individual variables'
        )
    })
  )
  .output(
    z.object({
      variables: z.array(variableSchema).optional().describe('List of matching variables'),
      groups: z
        .array(groupSchema)
        .optional()
        .describe('List of variable groups (when listGroups is true)'),
      totalFound: z.number().describe('Total number of results found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CensusDataClient(ctx.auth.token);

    if (ctx.input.listGroups) {
      let groups = await client.getDatasetGroups({
        dataset: ctx.input.dataset,
        vintage: ctx.input.vintage
      });

      let mapped: Array<{ groupId: string; groupName: string; variableCount?: number }> =
        groups.map((g: any) => ({
          groupId: g.name || '',
          groupName: g.description || '',
          variableCount: g.variables ? Object.keys(g.variables).length : undefined
        }));

      if (ctx.input.keyword) {
        let keyword = ctx.input.keyword.toLowerCase();
        mapped = mapped.filter(
          g =>
            g.groupId.toLowerCase().includes(keyword) ||
            g.groupName.toLowerCase().includes(keyword)
        );
      }

      return {
        output: {
          groups: mapped.slice(0, 200),
          totalFound: mapped.length
        },
        message: `Found **${mapped.length}** variable groups for ${ctx.input.dataset}${ctx.input.vintage ? ` (${ctx.input.vintage})` : ''}. Showing up to 200.`
      };
    }

    let variables: Record<string, any>;

    if (ctx.input.groupId) {
      variables = await client.getGroupVariables({
        dataset: ctx.input.dataset,
        vintage: ctx.input.vintage,
        groupId: ctx.input.groupId
      });
    } else {
      variables = await client.getDatasetVariables({
        dataset: ctx.input.dataset,
        vintage: ctx.input.vintage
      });
    }

    let mapped = Object.entries(variables).map(([name, meta]: [string, any]) => ({
      name,
      label: meta.label || '',
      concept: meta.concept || undefined,
      predicateType: meta.predicateType || undefined,
      group: meta.group || undefined
    }));

    if (ctx.input.keyword) {
      let keyword = ctx.input.keyword.toLowerCase();
      mapped = mapped.filter(
        v =>
          v.name.toLowerCase().includes(keyword) ||
          v.label.toLowerCase().includes(keyword) ||
          (v.concept || '').toLowerCase().includes(keyword)
      );
    }

    return {
      output: {
        variables: mapped.slice(0, 200),
        totalFound: mapped.length
      },
      message: `Found **${mapped.length}** variables for ${ctx.input.dataset}${ctx.input.vintage ? ` (${ctx.input.vintage})` : ''}${ctx.input.groupId ? ` in group ${ctx.input.groupId}` : ''}${ctx.input.keyword ? ` matching "${ctx.input.keyword}"` : ''}. Showing up to 200.`
    };
  })
  .build();
