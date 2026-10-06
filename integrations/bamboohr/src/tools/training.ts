import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid, responseId } from '../lib/contracts';
import { spec } from '../spec';

export let getTrainingTypes = SlateTool.create(spec, {
  name: 'Get Training Types',
  key: 'get_training_types',
  description: `Retrieve visible training types, including their IDs, names, assigned categories and required status.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      trainingTypes: z.array(z.record(z.string(), z.any())).describe('List of training types')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getTrainingTypes();
    let trainingTypes = data;

    return {
      output: {
        trainingTypes
      },
      message: `Retrieved **${trainingTypes.length}** training type(s).`
    };
  })
  .build();

export let getEmployeeTrainingRecords = SlateTool.create(spec, {
  name: 'Get Employee Training Records',
  key: 'get_employee_training_records',
  description: `Retrieve training records for a specific employee. Optionally filter by training type. Returns completion dates, instructors, hours, credits, and notes.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      trainingTypeId: z.string().optional().describe('Optionally filter by training type ID')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      trainingRecords: z
        .array(z.record(z.string(), z.any()))
        .describe('List of training records')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getTrainingRecordsForEmployee(
      ctx.input.employeeId,
      ctx.input.trainingTypeId
    );
    let trainingRecords = data;

    return {
      output: {
        employeeId: ctx.input.employeeId,
        trainingRecords
      },
      message: `Found **${trainingRecords.length}** training record(s) for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();

export let addTrainingRecord = SlateTool.create(spec, {
  name: 'Add Training Record',
  key: 'add_training_record',
  description: `Record a completed training for an employee. Specify the training type, completion date, and optionally the instructor, hours, credits, cost, and notes.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      trainingTypeId: z.string().describe('The training type ID'),
      completed: z.string().describe('Completion date in YYYY-MM-DD format'),
      instructor: z.string().optional().describe('Instructor name'),
      hours: z.number().optional().describe('Hours spent on training'),
      credits: z.number().optional().describe('Credits earned'),
      costAmount: z.number().optional().describe('Training cost amount'),
      costCurrency: z.string().optional().describe('Currency code (e.g., "USD")'),
      notes: z.string().optional().describe('Additional notes')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      trainingTypeId: z.string().describe('The training type ID'),
      completed: z.string().describe('Completion date'),
      trainingRecordId: z
        .string()
        .optional()
        .describe('The provider-assigned training record ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    if ((ctx.input.costAmount === undefined) !== (ctx.input.costCurrency === undefined))
      invalid('Supply costAmount and costCurrency together.');
    let cost =
      ctx.input.costAmount !== undefined && ctx.input.costCurrency !== undefined
        ? { currency: ctx.input.costCurrency, cost: ctx.input.costAmount }
        : undefined;

    const result = await client.addTrainingRecord(ctx.input.employeeId, {
      trainingTypeId: ctx.input.trainingTypeId,
      completed: ctx.input.completed,
      instructor: ctx.input.instructor,
      hours: ctx.input.hours,
      credits: ctx.input.credits,
      cost,
      notes: ctx.input.notes
    });

    return {
      output: {
        employeeId: ctx.input.employeeId,
        trainingTypeId: ctx.input.trainingTypeId,
        completed: ctx.input.completed,
        trainingRecordId: responseId(result.id)
      },
      message: `Added training record for employee **${ctx.input.employeeId}** completed on ${ctx.input.completed}.`
    };
  })
  .build();
