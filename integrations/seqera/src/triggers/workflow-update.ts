import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let workflowUpdate = SlateTrigger.create(spec, {
  name: 'Workflow Run Update',
  key: 'workflow_update',
  description:
    'Triggers when workflow runs are created, complete, or change status. Polls for new and updated workflow runs in the workspace.'
})
  .input(
    z.object({
      workflowId: z.string().describe('Workflow run ID'),
      runName: z.string().optional().describe('Run name'),
      status: z.string().optional().describe('Current run status'),
      projectName: z.string().optional().describe('Pipeline project name'),
      repository: z.string().optional().describe('Pipeline repository URL'),
      userName: z.string().optional().describe('User who launched the run'),
      start: z.string().optional().describe('Run start time'),
      complete: z.string().optional().describe('Run completion time'),
      duration: z.number().optional().describe('Run duration in milliseconds'),
      exitStatus: z.number().optional().describe('Process exit status'),
      errorMessage: z.string().optional().describe('Error message if failed'),
      dateCreated: z.string().optional().describe('Run creation time'),
      lastUpdated: z.string().optional().describe('Last updated time')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Workflow run ID'),
      runName: z.string().optional().describe('Run name'),
      status: z.string().optional().describe('Current run status'),
      projectName: z.string().optional().describe('Pipeline project name'),
      repository: z.string().optional().describe('Pipeline repository URL'),
      userName: z.string().optional().describe('User who launched the run'),
      start: z.string().optional().describe('Run start time'),
      complete: z.string().optional().describe('Run completion time'),
      duration: z.number().optional().describe('Run duration in milliseconds'),
      exitStatus: z.number().optional().describe('Process exit status'),
      errorMessage: z.string().optional().describe('Error message if failed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SeqeraClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl,
        workspaceId: ctx.config.workspaceId
      });

      let state = ctx.state as {
        knownWorkflows?: Record<string, string>;
        lastPoll?: string;
      } | null;
      let knownWorkflows = state?.knownWorkflows || {};
      let isFirstPoll = !state?.lastPoll;

      let result = await client.listWorkflows({
        max: 50,
        sortBy: 'lastUpdated',
        sortDir: 'desc'
      });

      let inputs: Array<{
        workflowId: string;
        runName?: string;
        status?: string;
        projectName?: string;
        repository?: string;
        userName?: string;
        start?: string;
        complete?: string;
        duration?: number;
        exitStatus?: number;
        errorMessage?: string;
        dateCreated?: string;
        lastUpdated?: string;
      }> = [];

      let updatedKnownWorkflows: Record<string, string> = {};

      for (let w of result.workflows) {
        if (!w.id) continue;

        let currentStatus = w.status || 'UNKNOWN';
        updatedKnownWorkflows[w.id] = currentStatus;

        let previousStatus = knownWorkflows[w.id];

        // On first poll, just record state without emitting events
        if (isFirstPoll) continue;

        // Emit if workflow is new or status changed
        if (!previousStatus || previousStatus !== currentStatus) {
          inputs.push({
            workflowId: w.id,
            runName: w.runName,
            status: w.status,
            projectName: w.projectName,
            repository: w.repository,
            userName: w.userName,
            start: w.start,
            complete: w.complete,
            duration: w.duration,
            exitStatus: w.exitStatus,
            errorMessage: w.errorMessage,
            dateCreated: w.dateCreated,
            lastUpdated: w.lastUpdated
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownWorkflows: updatedKnownWorkflows,
          lastPoll: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let status = (ctx.input.status || 'unknown').toLowerCase();
      let eventType: string;

      switch (status) {
        case 'submitted':
          eventType = 'workflow.submitted';
          break;
        case 'running':
          eventType = 'workflow.running';
          break;
        case 'succeeded':
          eventType = 'workflow.succeeded';
          break;
        case 'failed':
          eventType = 'workflow.failed';
          break;
        case 'cancelled':
          eventType = 'workflow.cancelled';
          break;
        default:
          eventType = `workflow.${status}`;
      }

      return {
        type: eventType,
        id: `${ctx.input.workflowId}-${ctx.input.status}-${ctx.input.lastUpdated || Date.now()}`,
        output: {
          workflowId: ctx.input.workflowId,
          runName: ctx.input.runName,
          status: ctx.input.status,
          projectName: ctx.input.projectName,
          repository: ctx.input.repository,
          userName: ctx.input.userName,
          start: ctx.input.start,
          complete: ctx.input.complete,
          duration: ctx.input.duration,
          exitStatus: ctx.input.exitStatus,
          errorMessage: ctx.input.errorMessage
        }
      };
    }
  })
  .build();
