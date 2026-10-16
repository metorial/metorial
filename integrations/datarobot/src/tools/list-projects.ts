import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let projectSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider response with credentials removed'),
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

let outputSchema = z.object({
  projects: z.array(projectSchema).describe('List of projects')
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
      projectName: z.string().optional().describe('Filter by project name'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of projects to return'),
      orderBy: z.string().optional().describe('Sort by projectName or -projectName')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let projects = await client.listProjects({
      projectName: ctx.input.projectName,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      orderBy: ctx.input.orderBy
    });

    let mapped = projects.map((p: any) => ({
      raw: p,
      projectId: p.id ?? p.projectId,
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
      output: parseOutput(outputSchema, { projects: mapped }),
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
