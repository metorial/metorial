import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

export let listRoutines = SlateTool.create(spec, {
  name: 'List Routines',
  key: 'list_routines',
  description: `List user-defined functions (UDFs), stored procedures, and table-valued functions in a BigQuery dataset.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset to list routines from'),
      maxResults: z.number().optional().describe('Maximum number of routines to return'),
      pageToken: z.string().optional().describe('Page token for paginated results'),
      filter: z.string().optional().describe('Filter expression for routines')
    })
  )
  .output(
    z.object({
      routines: z.array(
        z.object({
          routineId: z.string(),
          datasetId: z.string(),
          projectId: z.string(),
          routineType: z.string().optional(),
          language: z.string().optional(),
          creationTime: z.string().optional(),
          lastModifiedTime: z.string().optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.listRoutines(ctx.input.datasetId, {
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      filter: ctx.input.filter
    });

    let routines = (result.routines || []).map((r: any) => ({
      routineId: r.routineReference.routineId,
      datasetId: r.routineReference.datasetId,
      projectId: r.routineReference.projectId,
      routineType: r.routineType,
      language: r.language,
      creationTime: r.creationTime,
      lastModifiedTime: r.lastModifiedTime
    }));

    return {
      output: {
        routines,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${routines.length}** routine(s) in dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let getRoutine = SlateTool.create(spec, {
  name: 'Get Routine',
  key: 'get_routine',
  description: `Retrieve detailed information about a specific BigQuery routine including its definition, arguments, return type, and language.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the routine'),
      routineId: z.string().describe('Routine ID to retrieve')
    })
  )
  .output(
    z.object({
      routineId: z.string(),
      datasetId: z.string(),
      projectId: z.string(),
      routineType: z.string(),
      language: z.string().optional(),
      definitionBody: z.string().optional(),
      arguments: z.array(z.any()).optional(),
      returnType: z.any().optional(),
      description: z.string().optional(),
      creationTime: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let routine = await client.getRoutine(ctx.input.datasetId, ctx.input.routineId);

    return {
      output: {
        routineId: routine.routineReference.routineId,
        datasetId: routine.routineReference.datasetId,
        projectId: routine.routineReference.projectId,
        routineType: routine.routineType,
        language: routine.language,
        definitionBody: routine.definitionBody,
        arguments: routine.arguments,
        returnType: routine.returnType,
        description: routine.description,
        creationTime: routine.creationTime,
        lastModifiedTime: routine.lastModifiedTime
      },
      message: `Routine **${ctx.input.routineId}** (${routine.routineType}, ${routine.language || 'SQL'}).`
    };
  })
  .build();

export let createRoutine = SlateTool.create(spec, {
  name: 'Create Routine',
  key: 'create_routine',
  description: `Create a new BigQuery routine: user-defined function (UDF), stored procedure, or table-valued function. Routines can be written in SQL or JavaScript.`,
  instructions: [
    'Set routineType to SCALAR_FUNCTION for UDFs, PROCEDURE for stored procedures, or TABLE_VALUED_FUNCTION for TVFs.',
    'For JavaScript UDFs, set language to JAVASCRIPT and provide the function body in definitionBody.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset to create the routine in'),
      routineId: z.string().describe('Unique ID for the routine'),
      routineType: z
        .enum(['SCALAR_FUNCTION', 'PROCEDURE', 'TABLE_VALUED_FUNCTION'])
        .describe('Type of routine'),
      language: z
        .enum(['SQL', 'JAVASCRIPT'])
        .optional()
        .describe('Routine language (default SQL)'),
      definitionBody: z.string().describe('SQL or JavaScript body of the routine'),
      arguments: z
        .array(
          z.object({
            name: z.string().describe('Argument name'),
            dataType: z
              .object({
                typeKind: z
                  .string()
                  .describe('BigQuery type kind (STRING, INT64, FLOAT64, etc.)')
              })
              .describe('Argument data type'),
            mode: z
              .enum(['IN', 'OUT', 'INOUT'])
              .optional()
              .describe('Argument mode (for procedures)')
          })
        )
        .optional()
        .describe('Routine arguments'),
      returnType: z
        .object({
          typeKind: z.string().describe('BigQuery type kind for the return value')
        })
        .optional()
        .describe('Return type (for functions)'),
      description: z.string().optional().describe('Description of the routine')
    })
  )
  .output(
    z.object({
      routineId: z.string(),
      datasetId: z.string(),
      projectId: z.string(),
      routineType: z.string(),
      creationTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let routine = await client.createRoutine(ctx.input.datasetId, {
      routineId: ctx.input.routineId,
      routineType: ctx.input.routineType,
      language: ctx.input.language,
      definitionBody: ctx.input.definitionBody,
      arguments: ctx.input.arguments,
      returnType: ctx.input.returnType,
      description: ctx.input.description
    });

    return {
      output: {
        routineId: routine.routineReference.routineId,
        datasetId: routine.routineReference.datasetId,
        projectId: routine.routineReference.projectId,
        routineType: routine.routineType,
        creationTime: routine.creationTime
      },
      message: `Routine **${ctx.input.routineId}** (${ctx.input.routineType}) created in dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let deleteRoutine = SlateTool.create(spec, {
  name: 'Delete Routine',
  key: 'delete_routine',
  description: `Permanently delete a BigQuery routine (UDF, procedure, or TVF). This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the routine'),
      routineId: z.string().describe('Routine ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    await client.deleteRoutine(ctx.input.datasetId, ctx.input.routineId);

    return {
      output: { deleted: true },
      message: `Routine **${ctx.input.routineId}** deleted from dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
