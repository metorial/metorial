import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapRobot, rawSchema, robotParameterSchema } from '../lib/response';
import { spec } from '../spec';

export let getRobot = SlateTool.create(spec, {
  name: 'Get Robot',
  key: 'get_robot',
  description: `Retrieve detailed information about a specific Browse AI robot by its ID. Returns the robot's name, creation date, and the input parameters it accepts including parameter names, types, and whether they are required.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      robotId: z
        .string()
        .describe('ID of the robot to retrieve. Call list_robots to discover robot IDs.')
    })
  )
  .output(
    z.object({
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
    })
  )
  .handleInvocation(async ctx => {
    let robot = await new Client(ctx.auth).getRobot(ctx.input.robotId);
    let output = mapRobot(robot);
    return { output, message: `Retrieved robot \`${output.robotId}\`.` };
  })
  .build();
