import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let splitTestOutputSchema = z.object({
  splitTestId: z.string().describe('Unique split test identifier'),
  siteId: z.string().describe('Site this split test belongs to'),
  name: z.string().optional().describe('Split test name'),
  path: z.string().optional().describe('Path the split test applies to'),
  active: z.boolean().optional().describe('Whether the split test is active'),
  branches: z
    .array(
      z.object({
        branch: z.string().describe('Branch name'),
        percentage: z.number().describe('Traffic percentage for this branch')
      })
    )
    .optional()
    .describe('Branch traffic distribution'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  unpublishedAt: z.string().optional().describe('Timestamp when the split test was stopped')
});

let mapSplitTest = (test: any) => {
  let branches: Array<{ branch: string; percentage: number }> = [];
  if (test.branch_tests) {
    for (let [branch, percentage] of Object.entries(test.branch_tests)) {
      branches.push({ branch, percentage: percentage as number });
    }
  } else if (Array.isArray(test.branches)) {
    for (let branch of test.branches) {
      if (branch && typeof branch === 'object') {
        let branchRecord = branch as Record<string, unknown>;
        let name = String(branchRecord.branch ?? branchRecord.name ?? '');
        let percentage = Number(branchRecord.percentage ?? branchRecord.split ?? 0);
        if (name) {
          branches.push({ branch: name, percentage });
        }
      }
    }
  }

  return {
    splitTestId: test.id,
    siteId: test.site_id,
    name: test.name ?? undefined,
    path: test.path ?? undefined,
    active: test.active ?? undefined,
    branches: branches.length > 0 ? branches : undefined,
    createdAt: test.created_at ?? undefined,
    updatedAt: test.updated_at ?? undefined,
    unpublishedAt: test.unpublished_at ?? undefined
  };
};

export let listSplitTests = SlateTool.create(spec, {
  name: 'List Split Tests',
  key: 'list_split_tests',
  description: `List all A/B split tests for a Netlify site. Shows traffic distribution across branches and active status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to list split tests for')
    })
  )
  .output(
    z.object({
      splitTests: z.array(splitTestOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tests = await client.listSplitTests(ctx.input.siteId);

    let mapped = tests.map(mapSplitTest);

    return {
      output: { splitTests: mapped },
      message: `Found **${mapped.length}** split test(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let createSplitTest = SlateTool.create(spec, {
  name: 'Create Split Test',
  key: 'create_split_test',
  description: `Create a new A/B split test for a Netlify site. Define traffic distribution across branches.`,
  instructions: [
    'Branch percentages should sum to 100.',
    'Each branch must be a valid branch name in the linked repository.'
  ]
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to create the split test on'),
      branches: z
        .array(
          z.object({
            branch: z.string().describe('Branch name'),
            percentage: z.number().describe('Traffic percentage (0-100)')
          })
        )
        .describe('Traffic distribution across branches')
    })
  )
  .output(splitTestOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let branchTests: Record<string, number> = {};
    for (let b of ctx.input.branches) {
      branchTests[b.branch] = b.percentage;
    }

    let test = await client.createSplitTest(ctx.input.siteId, {
      branch_tests: branchTests
    });

    return {
      output: mapSplitTest(test),
      message: `Created split test on site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let updateSplitTest = SlateTool.create(spec, {
  name: 'Update Split Test',
  key: 'update_split_test',
  description: `Update the branch traffic distribution of an existing split test.`
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID'),
      splitTestId: z.string().describe('The split test ID to update'),
      branches: z
        .array(
          z.object({
            branch: z.string().describe('Branch name'),
            percentage: z.number().describe('Traffic percentage (0-100)')
          })
        )
        .describe('Updated traffic distribution')
    })
  )
  .output(splitTestOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let branchTests: Record<string, number> = {};
    for (let b of ctx.input.branches) {
      branchTests[b.branch] = b.percentage;
    }

    let test = await client.updateSplitTest(ctx.input.siteId, ctx.input.splitTestId, {
      branch_tests: branchTests
    });

    return {
      output: mapSplitTest(test),
      message: `Updated split test **${ctx.input.splitTestId}**.`
    };
  })
  .build();

export let toggleSplitTest = SlateTool.create(spec, {
  name: 'Toggle Split Test',
  key: 'toggle_split_test',
  description: `Enable or disable a split test on a Netlify site.`
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID'),
      splitTestId: z.string().describe('The split test ID'),
      enabled: z.boolean().describe('Set to true to enable or false to disable the split test')
    })
  )
  .output(splitTestOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let test: any;
    if (ctx.input.enabled) {
      await client.enableSplitTest(ctx.input.siteId, ctx.input.splitTestId);
    } else {
      await client.disableSplitTest(ctx.input.siteId, ctx.input.splitTestId);
    }
    test = await client.getSplitTest(ctx.input.siteId, ctx.input.splitTestId);

    return {
      output: mapSplitTest(test),
      message: `${ctx.input.enabled ? 'Enabled' : 'Disabled'} split test **${ctx.input.splitTestId}**.`
    };
  })
  .build();
