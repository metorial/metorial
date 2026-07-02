import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve all active reforestation projects with their details including name, description, country, project type, and available tree types. Each tree type includes CO2 sequestration data and credit cost. Use this to discover which project and tree to specify when planting.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Unique project identifier'),
            name: z.string().describe('Project name'),
            description: z.string().describe('Project description'),
            country: z.string().describe('Country where the project is located'),
            projectType: z.string().describe('Type of reforestation project'),
            supplierName: z.string().describe('Name of the project supplier'),
            isDefault: z.boolean().describe('Whether this is the default project'),
            projectImage: z.string().describe('URL of the project image'),
            trees: z
              .array(
                z.object({
                  treeId: z.number().describe('Unique tree type identifier'),
                  name: z.string().describe('Tree species name'),
                  description: z.string().describe('Tree description'),
                  tonnesCo2: z.number().describe('CO2 sequestered in tonnes per tree'),
                  creditsRequired: z
                    .number()
                    .describe('Number of credits required to plant this tree'),
                  isDefault: z.boolean().describe('Whether this is the default tree type'),
                  treeImage: z.string().describe('URL of the tree image')
                })
              )
              .describe('Available tree types for this project')
          })
        )
        .describe('List of active reforestation projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicValidationKey: ctx.auth.publicValidationKey
    });

    let projects = await client.getProjects();

    let totalTrees = projects.reduce((sum, p) => sum + p.trees.length, 0);

    return {
      output: { projects },
      message: `Found **${projects.length}** active projects with **${totalTrees}** available tree types across countries: ${[...new Set(projects.map(p => p.country))].join(', ')}.`
    };
  })
  .build();
