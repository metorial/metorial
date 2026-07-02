import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

let playlistItemSchema = z.object({
  type: z
    .enum(['dashboard_by_uid', 'dashboard_by_tag', 'dashboard_by_id'])
    .describe('Playlist item selector type. dashboard_by_id is deprecated by Grafana.'),
  value: z.string().describe('Dashboard UID, dashboard tag, or deprecated dashboard ID')
});

let mapPlaylist = (playlist: any) => {
  let metadata = playlist.metadata || {};
  let spec = playlist.spec || playlist;

  return {
    playlistUid: metadata.name || playlist.uid,
    title: spec.title || spec.name || playlist.name,
    interval: spec.interval || playlist.interval,
    items: spec.items || playlist.items || [],
    resourceVersion: metadata.resourceVersion,
    created: metadata.creationTimestamp || playlist.created,
    updated: metadata.annotations?.['grafana.app/updatedTimestamp'] || playlist.updated
  };
};

let getPlaylistItems = (response: any) =>
  Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];

export let listPlaylists = SlateTool.create(spec, {
  name: 'List Playlists',
  key: 'list_playlists',
  description: `List Grafana playlists. Playlists rotate through dashboards by UID or tag for wallboards, NOC displays, and recurring operational reviews.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      playlists: z.array(
        z.object({
          playlistUid: z.string().optional().describe('Playlist UID'),
          title: z.string().optional().describe('Playlist title'),
          interval: z.string().optional().describe('Rotation interval'),
          items: z.array(z.any()).optional().describe('Playlist items'),
          resourceVersion: z.string().optional().describe('Resource version')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      apiNamespace: ctx.config.apiNamespace
    });

    let playlists = getPlaylistItems(await client.listPlaylists()).map(mapPlaylist);

    return {
      output: { playlists },
      message: `Found **${playlists.length}** playlist(s).`
    };
  })
  .build();

export let getPlaylist = SlateTool.create(spec, {
  name: 'Get Playlist',
  key: 'get_playlist',
  description: `Retrieve a Grafana playlist by UID, including its rotation interval and dashboard selectors.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      playlistUid: z.string().describe('UID of the playlist to retrieve')
    })
  )
  .output(
    z.object({
      playlistUid: z.string().optional().describe('Playlist UID'),
      title: z.string().optional().describe('Playlist title'),
      interval: z.string().optional().describe('Rotation interval'),
      items: z.array(z.any()).optional().describe('Playlist items'),
      resourceVersion: z.string().optional().describe('Resource version'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      apiNamespace: ctx.config.apiNamespace
    });

    let playlist = mapPlaylist(await client.getPlaylist(ctx.input.playlistUid));

    return {
      output: playlist,
      message: `Retrieved playlist **${playlist.title || ctx.input.playlistUid}**.`
    };
  })
  .build();

export let createPlaylist = SlateTool.create(spec, {
  name: 'Create Playlist',
  key: 'create_playlist',
  description: `Create a Grafana playlist that cycles through dashboards selected by UID or tag.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      playlistUid: z.string().describe('Unique playlist UID'),
      title: z.string().describe('Playlist title'),
      interval: z.string().describe('Dashboard rotation interval, e.g. "5m"'),
      items: z.array(playlistItemSchema).describe('Dashboard selectors in playlist order')
    })
  )
  .output(
    z.object({
      playlistUid: z.string().optional().describe('Created playlist UID'),
      title: z.string().optional().describe('Playlist title'),
      interval: z.string().optional().describe('Rotation interval'),
      items: z.array(z.any()).optional().describe('Playlist items'),
      resourceVersion: z.string().optional().describe('Resource version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      apiNamespace: ctx.config.apiNamespace
    });

    let playlist = mapPlaylist(
      await client.createPlaylist({
        uid: ctx.input.playlistUid,
        name: ctx.input.title,
        interval: ctx.input.interval,
        items: ctx.input.items
      })
    );

    return {
      output: playlist,
      message: `Playlist **${ctx.input.title}** created.`
    };
  })
  .build();

export let updatePlaylist = SlateTool.create(spec, {
  name: 'Update Playlist',
  key: 'update_playlist',
  description: `Replace an existing Grafana playlist definition. Provide the full desired title, interval, and item list.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      playlistUid: z.string().describe('UID of the playlist to update'),
      title: z.string().describe('Updated playlist title'),
      interval: z.string().describe('Updated dashboard rotation interval, e.g. "10m"'),
      items: z.array(playlistItemSchema).describe('Replacement playlist items'),
      resourceVersion: z.string().optional().describe('Current resource version')
    })
  )
  .output(
    z.object({
      playlistUid: z.string().optional().describe('Updated playlist UID'),
      title: z.string().optional().describe('Playlist title'),
      interval: z.string().optional().describe('Rotation interval'),
      items: z.array(z.any()).optional().describe('Playlist items'),
      resourceVersion: z.string().optional().describe('Resource version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      apiNamespace: ctx.config.apiNamespace
    });

    let playlist = mapPlaylist(
      await client.updatePlaylist(ctx.input.playlistUid, {
        name: ctx.input.title,
        interval: ctx.input.interval,
        items: ctx.input.items,
        resourceVersion: ctx.input.resourceVersion
      })
    );

    return {
      output: playlist,
      message: `Playlist **${ctx.input.title}** updated.`
    };
  })
  .build();

export let deletePlaylist = SlateTool.create(spec, {
  name: 'Delete Playlist',
  key: 'delete_playlist',
  description: `Delete a Grafana playlist by UID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      playlistUid: z.string().describe('UID of the playlist to delete')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Grafana deletion status'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      apiNamespace: ctx.config.apiNamespace
    });

    let result = await client.deletePlaylist(ctx.input.playlistUid);

    return {
      output: {
        status: result.status,
        message: `Playlist ${ctx.input.playlistUid} deleted.`
      },
      message: `Playlist **${ctx.input.playlistUid}** has been deleted.`
    };
  })
  .build();
