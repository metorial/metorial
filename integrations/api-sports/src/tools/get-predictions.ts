import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let predictionSchema = z.object({
  winnerTeamId: z.number().nullable().describe('Predicted winner team ID'),
  winnerTeamName: z.string().nullable().describe('Predicted winner team name'),
  winOrDraw: z.boolean().nullable().describe('Whether the prediction is win or draw'),
  comment: z.string().nullable().describe('Prediction comment/summary'),
  advice: z.string().nullable().describe('Betting advice'),
  percentHome: z.string().nullable().describe('Home win percentage'),
  percentDraw: z.string().nullable().describe('Draw percentage'),
  percentAway: z.string().nullable().describe('Away win percentage'),
  goalsHome: z.string().nullable().describe('Predicted goals for home team'),
  goalsAway: z.string().nullable().describe('Predicted goals for away team'),
  homeLastFiveForm: z.string().nullable().describe('Home team recent form'),
  homeLastFiveAttack: z.string().nullable().describe('Home team attack strength'),
  homeLastFiveDefense: z.string().nullable().describe('Home team defense strength'),
  awayLastFiveForm: z.string().nullable().describe('Away team recent form'),
  awayLastFiveAttack: z.string().nullable().describe('Away team attack strength'),
  awayLastFiveDefense: z.string().nullable().describe('Away team defense strength'),
  homeTeamName: z.string().nullable().describe('Home team name'),
  awayTeamName: z.string().nullable().describe('Away team name'),
  leagueName: z.string().nullable().describe('League name')
});

export let getPredictionsTool = SlateTool.create(spec, {
  name: 'Get Predictions',
  key: 'get_predictions',
  description: `Retrieve AI-generated match predictions for a football fixture. Includes predicted winner, win probabilities, expected goals, betting advice, and team form analysis. Available for football fixtures only.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fixtureId: z.number().describe('The football fixture ID to get predictions for')
    })
  )
  .output(
    z.object({
      predictions: z.array(predictionSchema),
      count: z.number().describe('Number of predictions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, sport: 'football' });

    let data = await client.getPredictions(ctx.input.fixtureId);

    let results = (data.response ?? []).map((item: any) => {
      let predictions = item.predictions ?? {};
      let teams = item.teams ?? {};
      let league = item.league ?? {};
      return {
        winnerTeamId: predictions.winner?.id ?? null,
        winnerTeamName: predictions.winner?.name ?? null,
        winOrDraw: predictions.win_or_draw ?? null,
        comment: predictions.comment ?? null,
        advice: predictions.advice ?? null,
        percentHome: predictions.percent?.home ?? null,
        percentDraw: predictions.percent?.draw ?? null,
        percentAway: predictions.percent?.away ?? null,
        goalsHome: predictions.goals?.home ?? null,
        goalsAway: predictions.goals?.away ?? null,
        homeLastFiveForm: teams.home?.last_5?.form ?? null,
        homeLastFiveAttack: teams.home?.last_5?.att ?? null,
        homeLastFiveDefense: teams.home?.last_5?.def ?? null,
        awayLastFiveForm: teams.away?.last_5?.form ?? null,
        awayLastFiveAttack: teams.away?.last_5?.att ?? null,
        awayLastFiveDefense: teams.away?.last_5?.def ?? null,
        homeTeamName: teams.home?.name ?? null,
        awayTeamName: teams.away?.name ?? null,
        leagueName: league.name ?? null
      };
    });

    return {
      output: {
        predictions: results,
        count: results.length
      },
      message:
        results.length > 0
          ? `Prediction for fixture **#${ctx.input.fixtureId}**: ${results[0]?.advice ?? 'No advice available'}.`
          : `No predictions available for fixture **#${ctx.input.fixtureId}**.`
    };
  })
  .build();
