import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique project identifier'),
  projectName: z.string().describe('Name of the project'),
  fileName: z.string().optional().describe('Name of the uploaded dataset file'),
  stage: z.string().optional().describe('Current project stage (e.g. aim, modeling, eda)'),
  target: z.string().optional().nullable().describe('Target variable name'),
  targetType: z
    .string()
    .optional()
    .nullable()
    .describe('Target variable type (e.g. Binary, Regression)'),
  metric: z.string().optional().nullable().describe('Optimization metric'),
  autopilotMode: z.number().optional().nullable().describe('Autopilot mode used'),
  created: z.string().optional().describe('Project creation timestamp'),
  holdoutUnlocked: z.boolean().optional().describe('Whether holdout data has been unlocked')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List DataRobot projects with optional filtering. Returns project metadata including name, stage, target, and modeling configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectName: z.string().optional().describe('Filter by project name (partial match)'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of projects to return'),
      orderBy: z.string().optional().describe('Sort field (e.g. "-created" for newest first)')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let projects = await client.listProjects({
      projectName: ctx.input.projectName,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      orderBy: ctx.input.orderBy
    });

    let mapped = (Array.isArray(projects) ? projects : []).map((p: any) => ({
      projectId: p.id || p.projectId,
      projectName: p.projectName,
      fileName: p.fileName,
      stage: p.stage,
      target: p.target,
      targetType: p.targetType,
      metric: p.metric,
      autopilotMode: p.autopilotMode,
      created: p.created,
      holdoutUnlocked: p.holdoutUnlocked
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
