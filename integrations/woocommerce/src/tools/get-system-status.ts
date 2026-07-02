import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSystemStatus = SlateTool.create(spec, {
  name: 'Get System Status',
  key: 'get_system_status',
  description: `Retrieve system status information about the WooCommerce installation including environment details, database info, active plugins, and theme info. Useful for diagnostics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      environment: z.object({
        siteUrl: z.string(),
        homeUrl: z.string(),
        wcVersion: z.string(),
        wpVersion: z.string(),
        phpVersion: z.string(),
        maxUploadSize: z.number(),
        defaultTimezone: z.string(),
        wcDatabaseVersion: z.string()
      }),
      database: z.object({
        wcDatabaseVersion: z.string(),
        databasePrefix: z.string(),
        databaseTables: z.any()
      }),
      activePlugins: z.array(
        z.object({
          plugin: z.string(),
          name: z.string(),
          version: z.string(),
          author: z.string()
        })
      ),
      theme: z.object({
        name: z.string(),
        version: z.string(),
        authorUrl: z.string(),
        isChildTheme: z.boolean()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let status = await client.getSystemStatus();

    let env = status.environment || {};
    let db = status.database || {};

    return {
      output: {
        environment: {
          siteUrl: env.site_url || '',
          homeUrl: env.home_url || '',
          wcVersion: env.version || '',
          wpVersion: env.wp_version || '',
          phpVersion: env.php_version || '',
          maxUploadSize: env.max_upload_size || 0,
          defaultTimezone: env.default_timezone || '',
          wcDatabaseVersion: env.wc_database_version || ''
        },
        database: {
          wcDatabaseVersion: db.wc_database_version || '',
          databasePrefix: db.database_prefix || '',
          databaseTables: db.database_tables || {}
        },
        activePlugins: (status.active_plugins || []).map((p: any) => ({
          plugin: p.plugin || '',
          name: p.name || '',
          version: p.version || '',
          author: p.author || ''
        })),
        theme: {
          name: status.theme?.name || '',
          version: status.theme?.version || '',
          authorUrl: status.theme?.author_url || '',
          isChildTheme: status.theme?.is_child_theme || false
        }
      },
      message: `WooCommerce **${env.version || 'unknown'}** on WordPress **${env.wp_version || 'unknown'}** (PHP ${env.php_version || 'unknown'}).`
    };
  })
  .build();
