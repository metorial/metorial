import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';
import { databaseSchema, mapDatabase } from './shared';

export let getDatabase = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Retrieves details for a specific database on a Neon branch, including owner role and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch containing the database'),
      databaseName: z.string().describe('Name of the database to retrieve')
    })
  )
  .output(databaseSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getDatabase(
      ctx.input.projectId,
      ctx.input.branchId,
      ctx.input.databaseName
    );
    let database = mapDatabase(result.database);

    return {
      output: database,
      message: `Retrieved database **${database.name}** on branch \`${database.branchId}\`.`
    };
  })
  .build();
