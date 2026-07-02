import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let votingSessionOutputSchema = z.object({
  votingSessionId: z.string(),
  status: z.string().optional(),
  votesPerUser: z.number().optional(),
  createdOn: z.string().optional(),
  endedOn: z.string().optional()
});

export let startVotingSessionTool = SlateTool.create(spec, {
  name: 'Start Voting Session',
  key: 'start_voting_session',
  description: `Start a new voting session on a mural, allowing participants to cast votes on widgets.`
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to start a voting session on'),
      votesPerUser: z
        .number()
        .optional()
        .describe('Maximum number of votes each user can cast')
    })
  )
  .output(votingSessionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let vs = await client.startVotingSession(ctx.input.muralId, {
      votesPerUser: ctx.input.votesPerUser
    });

    return {
      output: {
        votingSessionId: vs.id,
        status: vs.status,
        votesPerUser: vs.votesPerUser,
        createdOn: vs.createdOn,
        endedOn: vs.endedOn
      },
      message: `Started voting session **${vs.id}**.`
    };
  })
  .build();

export let getVotingResultsTool = SlateTool.create(spec, {
  name: 'Get Voting Results',
  key: 'get_voting_results',
  description: `Retrieve the results of a voting session, including vote counts per widget.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural containing the voting session'),
      votingSessionId: z.string().describe('ID of the voting session to get results for')
    })
  )
  .output(
    z.object({
      votingSessionId: z.string(),
      results: z.any().describe('Voting results data including votes per widget')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.getVotingSessionResults(
      ctx.input.muralId,
      ctx.input.votingSessionId
    );

    return {
      output: {
        votingSessionId: ctx.input.votingSessionId,
        results
      },
      message: `Retrieved voting results for session **${ctx.input.votingSessionId}**.`
    };
  })
  .build();

export let listVotingSessionsTool = SlateTool.create(spec, {
  name: 'List Voting Sessions',
  key: 'list_voting_sessions',
  description: `List all voting sessions for a mural, including active and completed sessions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to list voting sessions from')
    })
  )
  .output(
    z.object({
      votingSessions: z.array(votingSessionOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listVotingSessions(ctx.input.muralId);

    let votingSessions = result.value.map(vs => ({
      votingSessionId: vs.id,
      status: vs.status,
      votesPerUser: vs.votesPerUser,
      createdOn: vs.createdOn,
      endedOn: vs.endedOn
    }));

    return {
      output: { votingSessions },
      message: `Found **${votingSessions.length}** voting session(s).`
    };
  })
  .build();
