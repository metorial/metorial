import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transferSchema = z.object({
  playerId: z.number().nullable().describe('Player ID'),
  playerName: z.string().nullable().describe('Player name'),
  date: z.string().nullable().describe('Transfer date'),
  type: z.string().nullable().describe('Transfer type (e.g., Free, Loan, N/A, €amount)'),
  teamInId: z.number().nullable().describe('Destination team ID'),
  teamInName: z.string().nullable().describe('Destination team name'),
  teamInLogo: z.string().nullable().describe('Destination team logo'),
  teamOutId: z.number().nullable().describe('Origin team ID'),
  teamOutName: z.string().nullable().describe('Origin team name'),
  teamOutLogo: z.string().nullable().describe('Origin team logo')
});

export let getTransfersTool = SlateTool.create(spec, {
  name: 'Get Transfers',
  key: 'get_transfers',
  description: `Retrieve football transfer history for a player or team. Returns transfer dates, types (loan, free, fee), and the teams involved. Useful for tracking transfer activity and player movement history.`,
  instructions: ['Provide either a playerId or teamId to query transfers.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      player: z.number().optional().describe('Player ID to get transfer history for'),
      team: z.number().optional().describe('Team ID to get transfer activity for')
    })
  )
  .output(
    z.object({
      transfers: z.array(transferSchema),
      count: z.number().describe('Number of transfers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, sport: 'football' });

    let data = await client.getTransfers({
      player: ctx.input.player,
      team: ctx.input.team
    });

    let allTransfers: any[] = [];
    for (let item of data.response ?? []) {
      let player = item.player ?? {};
      for (let transfer of item.transfers ?? []) {
        allTransfers.push({
          playerId: player.id ?? null,
          playerName: player.name ?? null,
          date: transfer.date ?? null,
          type: transfer.type ?? null,
          teamInId: transfer.teams?.in?.id ?? null,
          teamInName: transfer.teams?.in?.name ?? null,
          teamInLogo: transfer.teams?.in?.logo ?? null,
          teamOutId: transfer.teams?.out?.id ?? null,
          teamOutName: transfer.teams?.out?.name ?? null,
          teamOutLogo: transfer.teams?.out?.logo ?? null
        });
      }
    }

    return {
      output: {
        transfers: allTransfers,
        count: allTransfers.length
      },
      message: `Found **${allTransfers.length}** transfer(s)${ctx.input.player ? ` for player #${ctx.input.player}` : ''}${ctx.input.team ? ` for team #${ctx.input.team}` : ''}.`
    };
  })
  .build();
