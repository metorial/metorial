import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let newPlayer = SlateTrigger.create(spec, {
  name: 'New Player',
  key: 'new_player',
  description:
    'Triggers when a new player is detected in Pointagram by comparing the current player list against the previously known set.'
})
  .input(
    z.object({
      playerId: z.string().describe('Pointagram player ID'),
      playerName: z.string().describe('Name of the player'),
      playerEmail: z.string().optional().describe('Email of the player'),
      playerExternalId: z.string().optional().describe('External ID of the player'),
      raw: z.any().describe('Full player data from the API')
    })
  )
  .output(
    z.object({
      playerId: z.string().describe('Pointagram player ID'),
      playerName: z.string().describe('Name of the player'),
      playerEmail: z.string().optional().describe('Email of the player'),
      playerExternalId: z.string().optional().describe('External ID of the player')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new PointagramClient({
        token: ctx.auth.token,
        apiUser: ctx.auth.apiUser
      });

      let result = await client.listPlayers();
      let players: Record<string, unknown>[] = Array.isArray(result)
        ? result
        : (result?.players ?? []);

      let knownIds: string[] = (ctx.state?.knownPlayerIds as string[]) ?? [];
      let knownSet = new Set(knownIds);

      let newPlayers = players.filter(p => {
        let id = String(p.id ?? p.player_id ?? '');
        return id && !knownSet.has(id);
      });

      let allIds = players.map(p => String(p.id ?? p.player_id ?? '')).filter(Boolean);

      return {
        inputs: newPlayers.map(p => ({
          playerId: String(p.id ?? p.player_id ?? ''),
          playerName: String(p.name ?? p.player_name ?? ''),
          playerEmail: p.email
            ? String(p.email)
            : p.player_email
              ? String(p.player_email)
              : undefined,
          playerExternalId: p.external_id
            ? String(p.external_id)
            : p.player_external_id
              ? String(p.player_external_id)
              : undefined,
          raw: p
        })),
        updatedState: {
          knownPlayerIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'player.created',
        id: ctx.input.playerId,
        output: {
          playerId: ctx.input.playerId,
          playerName: ctx.input.playerName,
          playerEmail: ctx.input.playerEmail,
          playerExternalId: ctx.input.playerExternalId
        }
      };
    }
  })
  .build();
