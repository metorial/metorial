import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { mapCandidateFile, mapMember, mapStage, resultArray } from '../lib/shapes';
import { spec } from '../spec';

let createClient = (ctx: { auth: { token: string }; config: { subdomain: string } }) =>
  new WorkableClient({
    token: ctx.auth.token,
    subdomain: ctx.config.subdomain
  });

export let listMembersTool = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List Workable members. Use this to find member IDs required by candidate, requisition, employee, and time-off write actions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of members to return'),
      sinceId: z.string().optional().describe('Return members with ID greater than this ID'),
      maxId: z.string().optional().describe('Return members with ID less than this ID'),
      role: z.string().optional().describe('Filter by member role'),
      jobShortcode: z.string().optional().describe('Filter by job shortcode'),
      email: z.string().optional().describe('Filter by member email'),
      name: z.string().optional().describe('Filter by member name'),
      status: z.string().optional().describe('Filter by member status')
    })
  )
  .output(
    z.object({
      members: z.array(z.any()).describe('Workable members'),
      paging: z.any().optional().describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listMembers({
      limit: ctx.input.limit,
      since_id: ctx.input.sinceId,
      max_id: ctx.input.maxId,
      role: ctx.input.role,
      shortcode: ctx.input.jobShortcode,
      email: ctx.input.email,
      name: ctx.input.name,
      status: ctx.input.status
    });
    let members = (result.members || []).map(mapMember);

    return {
      output: {
        members,
        paging: result.paging
      },
      message: `Found **${members.length}** member(s).`
    };
  })
  .build();

export let listStagesTool = SlateTool.create(spec, {
  name: 'List Stages',
  key: 'list_stages',
  description: `List Workable recruitment stages. Provide jobShortcode to get stages for a specific job, or omit it for the account pipeline stages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobShortcode: z.string().optional().describe('Optional job shortcode')
    })
  )
  .output(z.object({ stages: z.array(z.any()).describe('Pipeline stages') }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = ctx.input.jobShortcode
      ? await client.getJobStages(ctx.input.jobShortcode)
      : await client.listStages();
    let stages = (result.stages || []).map(mapStage);

    return {
      output: { stages },
      message: `Found **${stages.length}** stage(s).`
    };
  })
  .build();

export let getJobApplicationFormTool = SlateTool.create(spec, {
  name: 'Get Job Application Form',
  key: 'get_job_application_form',
  description: `Retrieve the application form configuration for a Workable job.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ jobShortcode: z.string().describe('Job shortcode') }))
  .output(z.object({ applicationForm: z.any().describe('Application form response') }))
  .handleInvocation(async ctx => {
    let applicationForm = await createClient(ctx).getJobApplicationForm(
      ctx.input.jobShortcode
    );
    return {
      output: { applicationForm },
      message: `Retrieved application form for job **${ctx.input.jobShortcode}**.`
    };
  })
  .build();

export let listJobQuestionsTool = SlateTool.create(spec, {
  name: 'List Job Questions',
  key: 'list_job_questions',
  description: `List application questions for a Workable job. Use these question keys when creating or updating candidate answers.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ jobShortcode: z.string().describe('Job shortcode') }))
  .output(z.object({ questions: z.array(z.any()).describe('Job questions') }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getJobQuestions(ctx.input.jobShortcode);
    let questions = resultArray(result, 'questions');
    return {
      output: { questions },
      message: `Found **${questions.length}** question(s).`
    };
  })
  .build();

export let listJobCustomAttributesTool = SlateTool.create(spec, {
  name: 'List Job Custom Attributes',
  key: 'list_job_custom_attributes',
  description: `List custom attributes configured for a Workable job.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ jobShortcode: z.string().describe('Job shortcode') }))
  .output(z.object({ customAttributes: z.array(z.any()).describe('Job custom attributes') }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getJobCustomAttributes(ctx.input.jobShortcode);
    let customAttributes = resultArray(result, 'custom_attributes', 'customAttributes');
    return {
      output: { customAttributes },
      message: `Found **${customAttributes.length}** job custom attribute(s).`
    };
  })
  .build();

export let listAccountCustomAttributesTool = SlateTool.create(spec, {
  name: 'List Account Custom Attributes',
  key: 'list_account_custom_attributes',
  description: `List account-level custom attributes in Workable.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({ customAttributes: z.array(z.any()).describe('Account custom attributes') })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listAccountCustomAttributes();
    let customAttributes = resultArray(result, 'custom_attributes', 'customAttributes');
    return {
      output: { customAttributes },
      message: `Found **${customAttributes.length}** account custom attribute(s).`
    };
  })
  .build();

export let listDisqualificationReasonsTool = SlateTool.create(spec, {
  name: 'List Disqualification Reasons',
  key: 'list_disqualification_reasons',
  description: `List Workable disqualification reasons. Use the returned IDs with manage_candidate disqualify.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      disqualificationReasons: z
        .array(z.any())
        .describe('Disqualification reasons returned by Workable')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listDisqualificationReasons();
    let disqualificationReasons = resultArray(
      result,
      'disqualification_reasons',
      'disqualificationReasons'
    );
    return {
      output: { disqualificationReasons },
      message: `Found **${disqualificationReasons.length}** disqualification reason(s).`
    };
  })
  .build();

export let listLegalEntitiesTool = SlateTool.create(spec, {
  name: 'List Legal Entities',
  key: 'list_legal_entities',
  description: `List Workable legal entities for employee create/update operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(z.object({ legalEntities: z.array(z.any()).describe('Legal entities') }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listLegalEntities();
    let legalEntities = resultArray(result, 'legal_entities', 'legalEntities');
    return {
      output: { legalEntities },
      message: `Found **${legalEntities.length}** legal entit(ies).`
    };
  })
  .build();

export let listWorkSchedulesTool = SlateTool.create(spec, {
  name: 'List Work Schedules',
  key: 'list_work_schedules',
  description: `List Workable work schedules for employee create/update operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(z.object({ workSchedules: z.array(z.any()).describe('Work schedules') }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listWorkSchedules();
    let workSchedules = resultArray(result, 'work_schedules', 'workSchedules');
    return {
      output: { workSchedules },
      message: `Found **${workSchedules.length}** work schedule(s).`
    };
  })
  .build();

export let listEmployeeFieldsTool = SlateTool.create(spec, {
  name: 'List Employee Fields',
  key: 'list_employee_fields',
  description: `List Workable employee fields for HR create/update payload construction.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(z.object({ employeeFields: z.array(z.any()).describe('Employee fields') }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listEmployeeFields();
    let employeeFields = resultArray(result, 'employee_fields', 'employeeFields');
    return {
      output: { employeeFields },
      message: `Found **${employeeFields.length}** employee field(s).`
    };
  })
  .build();

export let listCandidateFilesTool = SlateTool.create(spec, {
  name: 'List Candidate Files',
  key: 'list_candidate_files',
  description: `List file metadata for a Workable candidate. The tool returns Workable file URLs and metadata, not downloaded file content.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ candidateId: z.string().describe('Candidate ID') }))
  .output(z.object({ files: z.array(z.any()).describe('Candidate file metadata') }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listCandidateFiles(ctx.input.candidateId);
    let files = (result.files || []).map(mapCandidateFile);
    return {
      output: { files },
      message: `Found **${files.length}** candidate file(s).`
    };
  })
  .build();
