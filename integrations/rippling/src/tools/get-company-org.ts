import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let listDepartments = SlateTool.create(spec, {
  name: 'List Departments',
  key: 'list_departments',
  description: `Retrieve all departments in the company. Supports pagination for companies with many departments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of departments to return'),
      offset: z.number().optional().describe('Number of departments to skip for pagination')
    })
  )
  .output(
    z.object({
      departments: z.array(z.any()).describe('List of department objects'),
      count: z.number().describe('Number of departments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let departments = await client.listDepartments({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let items = Array.isArray(departments) ? departments : [];

    return {
      output: {
        departments: items,
        count: items.length
      },
      message: `Retrieved **${items.length}** department(s).`
    };
  })
  .build();

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve all teams in the company. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of teams to return'),
      offset: z.number().optional().describe('Number of teams to skip for pagination')
    })
  )
  .output(
    z.object({
      teams: z.array(z.any()).describe('List of team objects'),
      count: z.number().describe('Number of teams returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let teams = await client.listTeams({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let items = Array.isArray(teams) ? teams : [];

    return {
      output: {
        teams: items,
        count: items.length
      },
      message: `Retrieved **${items.length}** team(s).`
    };
  })
  .build();

export let listWorkLocations = SlateTool.create(spec, {
  name: 'List Work Locations',
  key: 'list_work_locations',
  description: `Retrieve all work locations configured for the company.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workLocations: z.array(z.any()).describe('List of work location objects'),
      count: z.number().describe('Number of work locations returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let locations = await client.listWorkLocations();

    let items = Array.isArray(locations) ? locations : [];

    return {
      output: {
        workLocations: items,
        count: items.length
      },
      message: `Retrieved **${items.length}** work location(s).`
    };
  })
  .build();

export let listLevels = SlateTool.create(spec, {
  name: 'List Levels',
  key: 'list_levels',
  description: `Retrieve all company levels/positions defined in Rippling.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      levels: z.array(z.any()).describe('List of level objects'),
      count: z.number().describe('Number of levels returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let levels = await client.listLevels();

    let items = Array.isArray(levels) ? levels : [];

    return {
      output: {
        levels: items,
        count: items.length
      },
      message: `Retrieved **${items.length}** level(s).`
    };
  })
  .build();
