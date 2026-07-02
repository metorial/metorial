import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let robotSchema = z.object({
  robotId: z.string().describe('Unique identifier of the robot'),
  name: z.string().describe('Name of the robot'),
  createdAt: z.number().optional().describe('Unix timestamp when the robot was created'),
  inputParameters: z
    .array(
      z.object({
        name: z.string().describe('Parameter name'),
        type: z.string().describe('Parameter type'),
        required: z.boolean().describe('Whether the parameter is required')
      })
    )
    .optional()
    .describe('Input parameters accepted by the robot')
});

export let listRobots = SlateTool.create(spec, {
  name: 'List Robots',
  key: 'list_robots',
  description: `Retrieve all configured web scraping robots in your Browse AI account. Returns each robot's ID, name, creation date, and the input parameters it accepts. Use this to discover available robots before running tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalCount: z.number().describe('Total number of robots'),
      robots: z.array(robotSchema).describe('List of robots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listRobots();

    let robots = (result.items ?? []).map((r: any) => ({
      robotId: r.id,
      name: r.name,
      createdAt: r.createdAt,
      inputParameters: r.inputParameters
    }));

    return {
      output: {
        totalCount: result.totalCount ?? robots.length,
        robots
      },
      message: `Found **${robots.length}** robot(s).`
    };
  })
  .build();
