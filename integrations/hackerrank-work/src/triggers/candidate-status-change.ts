import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let candidateStatusChange = SlateTrigger.create(spec, {
  name: 'Candidate Status Change',
  key: 'candidate_status_change',
  description:
    'Polls for candidate status changes across all tests. Detects when candidates are invited, start a test, complete a test, or change ATS status.'
})
  .input(
    z.object({
      testId: z.string().describe('ID of the test'),
      candidateId: z.string().describe('ID of the candidate'),
      email: z.string().optional().describe('Email of the candidate'),
      fullName: z.string().optional().describe('Full name of the candidate'),
      status: z.string().describe('Current status of the candidate'),
      atsState: z.string().optional().describe('Current ATS state of the candidate'),
      score: z.number().optional().describe('Candidate score'),
      completedAt: z.string().optional().describe('When the candidate completed the test'),
      testName: z.string().optional().describe('Name of the test')
    })
  )
  .output(
    z.object({
      testId: z.string().describe('ID of the test'),
      testName: z.string().optional().describe('Name of the test'),
      candidateId: z.string().describe('ID of the candidate'),
      email: z.string().optional().describe('Email of the candidate'),
      fullName: z.string().optional().describe('Full name of the candidate'),
      status: z.string().describe('Current status of the candidate'),
      atsState: z.string().optional().describe('Current ATS state of the candidate'),
      score: z.number().optional().describe('Candidate score'),
      completedAt: z.string().optional().describe('When the candidate completed the test')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let previousCandidateStates: Record<string, string> =
        (ctx.state?.candidateStates as Record<string, string>) ?? {};
      let trackedTestIds: string[] = (ctx.state?.trackedTestIds as string[]) ?? [];
      let lastFullScan: string | undefined = ctx.state?.lastFullScan as string | undefined;

      let now = new Date().toISOString();
      let shouldFullScan =
        !lastFullScan || Date.now() - new Date(lastFullScan).getTime() > 30 * 60 * 1000;

      // Periodically rescan all tests to pick up newly created ones
      if (shouldFullScan) {
        try {
          let testsResult = await client.listTests({ limit: 100, offset: 0 });
          trackedTestIds = testsResult.data.map((t: any) => String(t.id));
          lastFullScan = now;
        } catch {
          // If we can't fetch tests, keep using the existing tracked IDs
        }
      }

      let inputs: Array<{
        testId: string;
        candidateId: string;
        email?: string;
        fullName?: string;
        status: string;
        atsState?: string;
        score?: number;
        completedAt?: string;
        testName?: string;
      }> = [];

      let updatedStates: Record<string, string> = { ...previousCandidateStates };

      for (let testId of trackedTestIds) {
        try {
          let candidatesResult = await client.listCandidates(testId, {
            limit: 100,
            offset: 0
          });

          for (let candidate of candidatesResult.data) {
            let candidateKey = `${testId}:${candidate.id}`;
            let currentStateValue = `${candidate.status ?? ''}|${candidate.ats_state ?? ''}|${candidate.score ?? ''}`;
            let previousStateValue = previousCandidateStates[candidateKey];

            if (previousStateValue !== currentStateValue) {
              inputs.push({
                testId: String(testId),
                candidateId: String(candidate.id),
                email: candidate.email,
                fullName: candidate.full_name,
                status: candidate.status ?? 'unknown',
                atsState: candidate.ats_state,
                score: candidate.score != null ? Number(candidate.score) : undefined,
                completedAt: candidate.completed_at,
                testName: candidate.test_name
              });

              updatedStates[candidateKey] = currentStateValue;
            }
          }
        } catch {
          // Skip tests that fail to fetch candidates
        }
      }

      return {
        inputs,
        updatedState: {
          candidateStates: updatedStates,
          trackedTestIds,
          lastFullScan
        }
      };
    },

    handleEvent: async ctx => {
      let statusType =
        ctx.input.status === 'completed'
          ? 'completed'
          : ctx.input.status === 'started'
            ? 'started'
            : ctx.input.status === 'invited'
              ? 'invited'
              : 'updated';

      return {
        type: `candidate.${statusType}`,
        id: `${ctx.input.testId}:${ctx.input.candidateId}:${ctx.input.status}:${ctx.input.atsState ?? ''}:${ctx.input.score ?? ''}`,
        output: {
          testId: ctx.input.testId,
          testName: ctx.input.testName,
          candidateId: ctx.input.candidateId,
          email: ctx.input.email,
          fullName: ctx.input.fullName,
          status: ctx.input.status,
          atsState: ctx.input.atsState,
          score: ctx.input.score,
          completedAt: ctx.input.completedAt
        }
      };
    }
  });
