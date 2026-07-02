import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      robotId: z.string().describe('ID of the robot to retrieve')
    })
  )
  .output(
    z.object({
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let robot = await client.getRobot(ctx.input.robotId);

    return {
      output: {
        robotId: robot.id,
        name: robot.name,
        createdAt: robot.createdAt,
        inputParameters: robot.inputParameters
      },
      message: `Retrieved robot **${robot.name}** (\`${robot.id}\`).`
    };
  })
  .build();
