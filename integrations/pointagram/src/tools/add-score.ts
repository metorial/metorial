import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let addScore = SlateTool.create(spec, {
  name: 'Add Score',
  key: 'add_score',
  description: `Adds points to a player in a specific score series. Identify the score series by ID or name, and the player by ID, name, email, or external ID. Supports tags, comments, backdating, point types, deduplication via source score ID, and auto-creation of players.`,
  instructions: [
    'Provide either `scoreseriesId` or `scoreseriesName` to identify the score series.',
    'Provide either `points` (numeric) or `pointtypeName` (named point type) to set the score amount.',
    'Identify the player using at least one of: `playerId`, `playerName`, `playerEmail`, or `playerExternalId`.',
    'Use `sourceScoreId` for idempotency — resubmitting with the same value revokes the old transaction and creates a new one.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scoreseriesId: z.string().optional().describe('ID of the score series to add points to'),
      scoreseriesName: z
        .string()
        .optional()
        .describe('Name of the score series (alternative to ID)'),
      points: z.number().optional().describe('Number of points to add'),
      pointtypeName: z
        .string()
        .optional()
        .describe('Name of a predefined point type (alternative to numeric points)'),
      playerId: z.string().optional().describe('Pointagram player ID'),
      playerName: z.string().optional().describe('Name of the player'),
      playerEmail: z.string().optional().describe('Email of the player'),
      playerExternalId: z.string().optional().describe('External ID of the player'),
      sourceScoreId: z
        .string()
        .optional()
        .describe(
          'Idempotency key — resubmitting with the same value revokes the previous transaction'
        ),
      comment: z.string().optional().describe('Comment visible in the news feed'),
      scoreTime: z
        .string()
        .optional()
        .describe('Backdate the transaction to this UTC datetime'),
      tags: z
        .array(
          z.object({
            name: z.string().describe('Tag name')
          })
        )
        .optional()
        .describe('Tags to categorize this score entry'),
      createPlayer: z
        .boolean()
        .optional()
        .describe('If true, automatically creates the player if they do not exist')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Response from the Pointagram API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let result = await client.addScore({
      scoreseriesId: ctx.input.scoreseriesId,
      scoreseriesName: ctx.input.scoreseriesName,
      points: ctx.input.points,
      pointtypeName: ctx.input.pointtypeName,
      playerId: ctx.input.playerId,
      playerName: ctx.input.playerName,
      playerEmail: ctx.input.playerEmail,
      playerExternalId: ctx.input.playerExternalId,
      sourceScoreId: ctx.input.sourceScoreId,
      comment: ctx.input.comment,
      scoreTime: ctx.input.scoreTime,
      tags: ctx.input.tags,
      createPlayer: ctx.input.createPlayer
    });

    let player =
      ctx.input.playerName ||
      ctx.input.playerEmail ||
      ctx.input.playerExternalId ||
      ctx.input.playerId ||
      'unknown';
    let series = ctx.input.scoreseriesName || ctx.input.scoreseriesId || 'unknown';
    let pointsStr =
      ctx.input.points !== undefined
        ? `${ctx.input.points} points`
        : ctx.input.pointtypeName || 'points';

    return {
      output: { result },
      message: `Added **${pointsStr}** to player **${player}** in score series "${series}".`
    };
  })
  .build();
