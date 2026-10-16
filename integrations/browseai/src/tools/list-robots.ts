import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapRobot, numeric, objects, rawSchema, robotParameterSchema } from '../lib/response';
import { spec } from '../spec';

let robotSchema = z.object({
  robotId: z
    .string()
    .describe('Unique identifier of the robot. Call list_robots to discover robot IDs.'),
  name: z.string().optional().describe('Name of the robot when supplied by Browse AI'),
  createdAt: z.number().optional().describe('Unix timestamp when the robot was created'),
  inputParameters: z
    .array(robotParameterSchema)
    .optional()
    .describe('Input parameters accepted by the robot'),
  raw: rawSchema.optional()
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
      robots: z.array(robotSchema).describe('List of robots'),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listRobots();
    let robots = objects(result.items, 'robots').map(mapRobot);
    return {
      output: {
        totalCount: numeric(result.totalCount, 'robot total count'),
        robots,
        raw: result
      },
      message: `Retrieved **${robots.length}** robot(s).`
    };
  })
  .build();
