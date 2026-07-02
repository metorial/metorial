import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProblem = SlateTool.create(spec, {
  name: 'Create Problem',
  key: 'create_problem',
  description: `Create a new problem in Freshservice. Problems track root causes of incidents.

Status: 1=Open, 2=Change Requested, 3=Closed.
Priority: 1=Low, 2=Medium, 3=High, 4=Urgent.
Impact: 1=Low, 2=Medium, 3=High.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject of the problem'),
      description: z.string().optional().describe('HTML description'),
      email: z.string().optional().describe('Email of the requester'),
      requesterId: z.number().optional().describe('User ID of the requester'),
      status: z.number().optional().describe('Status: 1=Open, 2=Change Requested, 3=Closed'),
      priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      impact: z.number().optional().describe('Impact: 1=Low, 2=Medium, 3=High'),
      groupId: z.number().optional().describe('Agent group ID'),
      agentId: z.number().optional().describe('Assigned agent ID'),
      departmentId: z.number().optional().describe('Department ID'),
      category: z.string().optional().describe('Category'),
      subCategory: z.string().optional().describe('Sub-category'),
      itemCategory: z.string().optional().describe('Item category'),
      dueBy: z.string().optional().describe('Due date (ISO 8601)'),
      knownError: z.boolean().optional().describe('Whether this is a known error'),
      customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields')
    })
  )
  .output(
    z.object({
      problemId: z.number().describe('ID of the created problem'),
      subject: z.string().describe('Subject'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let problem = await client.createProblem(ctx.input);

    return {
      output: {
        problemId: problem.id,
        subject: problem.subject,
        status: problem.status,
        priority: problem.priority,
        createdAt: problem.created_at
      },
      message: `Created problem **#${problem.id}**: "${problem.subject}"`
    };
  })
  .build();

export let getProblem = SlateTool.create(spec, {
  name: 'Get Problem',
  key: 'get_problem',
  description: `Retrieve a single problem by its ID with all details including analysis fields (cause, symptom, impact).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      problemId: z.number().describe('ID of the problem')
    })
  )
  .output(
    z.object({
      problemId: z.number().describe('ID of the problem'),
      subject: z.string().describe('Subject'),
      description: z.string().nullable().describe('HTML description'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      impact: z.number().describe('Impact'),
      requesterId: z.number().describe('Requester ID'),
      agentId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      departmentId: z.number().nullable().describe('Department ID'),
      category: z.string().nullable().describe('Category'),
      knownError: z.boolean().describe('Whether this is a known error'),
      dueBy: z.string().nullable().describe('Due date'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      customFields: z.record(z.string(), z.unknown()).nullable().describe('Custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let problem = await client.getProblem(ctx.input.problemId);

    return {
      output: {
        problemId: problem.id,
        subject: problem.subject,
        description: problem.description,
        status: problem.status,
        priority: problem.priority,
        impact: problem.impact,
        requesterId: problem.requester_id,
        agentId: problem.agent_id,
        groupId: problem.group_id,
        departmentId: problem.department_id,
        category: problem.category,
        knownError: problem.known_error,
        dueBy: problem.due_by,
        createdAt: problem.created_at,
        updatedAt: problem.updated_at,
        customFields: problem.custom_fields
      },
      message: `Retrieved problem **#${problem.id}**: "${problem.subject}"`
    };
  })
  .build();

export let listProblems = SlateTool.create(spec, {
  name: 'List Problems',
  key: 'list_problems',
  description: `List all problems in Freshservice with pagination support.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 30, max: 100)')
    })
  )
  .output(
    z.object({
      problems: z.array(
        z.object({
          problemId: z.number().describe('ID'),
          subject: z.string().describe('Subject'),
          status: z.number().describe('Status'),
          priority: z.number().describe('Priority'),
          impact: z.number().describe('Impact'),
          agentId: z.number().nullable().describe('Assigned agent ID'),
          groupId: z.number().nullable().describe('Assigned group ID'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listProblems({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let problems = result.problems.map((p: Record<string, unknown>) => ({
      problemId: p.id as number,
      subject: p.subject as string,
      status: p.status as number,
      priority: p.priority as number,
      impact: p.impact as number,
      agentId: p.agent_id as number | null,
      groupId: p.group_id as number | null,
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string
    }));

    return {
      output: { problems },
      message: `Found **${problems.length}** problems`
    };
  })
  .build();

export let updateProblem = SlateTool.create(spec, {
  name: 'Update Problem',
  key: 'update_problem',
  description: `Update an existing problem's properties such as status, priority, assignment, and custom fields.

Status: 1=Open, 2=Change Requested, 3=Closed.
Priority: 1=Low, 2=Medium, 3=High, 4=Urgent.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      problemId: z.number().describe('ID of the problem to update'),
      subject: z.string().optional().describe('Updated subject'),
      description: z.string().optional().describe('Updated HTML description'),
      status: z.number().optional().describe('Status: 1=Open, 2=Change Requested, 3=Closed'),
      priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      impact: z.number().optional().describe('Impact: 1=Low, 2=Medium, 3=High'),
      groupId: z.number().optional().describe('Agent group ID'),
      agentId: z.number().optional().describe('Assigned agent ID'),
      departmentId: z.number().optional().describe('Department ID'),
      category: z.string().optional().describe('Category'),
      subCategory: z.string().optional().describe('Sub-category'),
      itemCategory: z.string().optional().describe('Item category'),
      dueBy: z.string().optional().describe('Due date (ISO 8601)'),
      knownError: z.boolean().optional().describe('Known error flag'),
      customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields')
    })
  )
  .output(
    z.object({
      problemId: z.number().describe('ID of the updated problem'),
      subject: z.string().describe('Subject'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let { problemId, ...updateParams } = ctx.input;
    let problem = await client.updateProblem(problemId, updateParams);

    return {
      output: {
        problemId: problem.id,
        subject: problem.subject,
        status: problem.status,
        priority: problem.priority,
        updatedAt: problem.updated_at
      },
      message: `Updated problem **#${problem.id}**: "${problem.subject}"`
    };
  })
  .build();

export let deleteProblem = SlateTool.create(spec, {
  name: 'Delete Problem',
  key: 'delete_problem',
  description: `Delete a problem by its ID. Deleted problems can be restored.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      problemId: z.number().describe('ID of the problem to delete')
    })
  )
  .output(
    z.object({
      problemId: z.number().describe('ID of the deleted problem'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    await client.deleteProblem(ctx.input.problemId);

    return {
      output: {
        problemId: ctx.input.problemId,
        deleted: true
      },
      message: `Deleted problem **#${ctx.input.problemId}**`
    };
  })
  .build();

export let restoreProblem = SlateTool.create(spec, {
  name: 'Restore Problem',
  key: 'restore_problem',
  description: `Restore a deleted Freshservice problem by ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      problemId: z.number().describe('ID of the deleted problem to restore')
    })
  )
  .output(
    z.object({
      problemId: z.number().describe('ID of the restored problem'),
      restored: z.boolean().describe('Whether the restore was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    await client.restoreProblem(ctx.input.problemId);

    return {
      output: {
        problemId: ctx.input.problemId,
        restored: true
      },
      message: `Restored problem **#${ctx.input.problemId}**`
    };
  })
  .build();
