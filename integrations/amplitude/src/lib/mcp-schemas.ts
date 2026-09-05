import { z } from 'zod';

// Captured from Amplitude's authenticated official MCP tools/list on 2026-09-05.
// Public aliases restrict consolidated upstream tools to their named operation.
export const hostedMcpInputSchemas = {
  get_amplitude_charts: z
    .object({
      chartIds: z.array(z.string()).describe('Saved chart IDs to read.').optional(),
      chartEditIds: z
        .array(z.string())
        .describe('Chart edit IDs to read (data mode only).')
        .optional(),
      include: z
        .enum(['link', 'typed', 'definition', 'data', 'guide'])
        .describe(
          "What to return: 'link' (default, URL only — free), 'typed' (UI-shaped chart params for query_amplitude_data), 'definition' (raw chart config), 'data' (run the chart), or 'guide' (chart-type parameter schema/enums/example — no ids needed, use chartType)."
        )
        .optional(),
      groupByLimit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .describe('data mode only: max group-by values to return (1-1000, default 10).')
        .optional(),
      excludeIncompleteDatapoints: z
        .boolean()
        .describe('data mode only: exclude the current (incomplete) interval. Default false.')
        .optional(),
      timeSeriesLimit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .describe(
          'data mode only: max group-by values that include per-interval rows (default 6; 0 = totals only).'
        )
        .optional(),
      chartType: z
        .string()
        .describe(
          'guide mode only: the chart type to get parameter schema/enums/example for. Supported: eventsSegmentation, funnels, metricExplorer, retention, revenueLtv, sessions, stickiness. Omit to list all supported types instead.'
        )
        .optional(),
      vis: z
        .enum(['line', 'area', 'bar', 'pie', 'stackedbar'])
        .describe(
          'data mode only: override the eventsSegmentation visualization type (line, area, bar, pie, stackedbar). Used by the chart widget vis switcher.'
        )
        .optional(),
      theme: z
        .enum(['light', 'dark'])
        .describe(
          'data mode only: fetch only this theme of an eventsSegmentation Highcharts config. Used by the chart widget for active-theme-first rendering.'
        )
        .optional(),
      includeAdditionalInfo: z
        .array(z.enum(['chartConfig']))
        .describe(
          'data mode only: additional render-only information. Omit for compact analytics data; the chart app passes ["chartConfig"].'
        )
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  query_amplitude_data: z
    .object({
      projectId: z
        .string()
        .describe(
          'Project ID to query data from Call get_amplitude_context to discover accessible project IDs.'
        ),
      definition: z
        .object({
          app: z
            .string()
            .describe(
              'Project ID (required) Call get_amplitude_context to discover accessible project IDs.'
            ),
          type: z
            .string()
            .describe('Query type (e.g., "eventsSegmentation", "funnel", "retention")'),
          name: z.string().describe('Query name').optional(),
          params: z.object({}).passthrough().describe('Query parameters'),
          version: z.number().describe('API version (optional, defaults to 40)').optional()
        })
        .passthrough()
        .describe(
          'FALLBACK — prefer the typed `chart` parameter. Raw chart definition for types/params the typed model does not cover (e.g. composition, revenueLtv). Validated inline — on failure the response includes chartTypeSchema (params, enums, example, coercion rules) so you can fix and retry.\n\nUse canonical chart types only:\n- "eventsSegmentation"\n- "funnels"\n- "retention"\n- "sessions"\n- "revenueLtv"\n- "dataTableV2"\n\nDo not use aliases like:\n- "segmentation"\n- "event_segmentation"\n- "events"\n- "funnel"\n\nTIME RANGE — three accepted shapes, mutually exclusive with each other:\n- "range" preset (e.g. "Last 30 Days", "Last 12 Weeks", "This Month", "Yesterday")\n- "start" + "end" for a bounded custom range\n- "start" alone for an open-ended "since <date>" range (renders as Amplitude\'s "Since" view)\n- Timestamps may be Unix seconds, ISO 8601 strings, or relative strings like "now-7d" / "now"\n- Do not combine "range" with "start"/"end". Do not provide "end" without "start"\n- Do not use invalid placeholders like "Custom", "Daily", or "All Time"\n\nVISUALIZATION TYPE (top-level "vis", optional):\n- Set "vis" when the user explicitly asks for a specific chart shape (e.g. "as a bar chart", "show as a pie", "stacked bar by country"). Otherwise omit and the system picks a sensible default.\n- Valid values for eventsSegmentation: "line" (default trend), "area", "bar" (vertical), "column" (horizontal), "stackedbar", "pie", "kpi" (single number).\n- Valid values for funnels: "line", "bar".\n- Valid values for sessions: "line", "bar", "totalSessions", "average".\n- "vis" goes at the TOP LEVEL of the definition, NOT inside "params".\n\nCOMMON GUARDRAILS:\n- "dataTableV2" requires "params.table"\n- "sessions" requires "params.sessions"\n- "customerJourney" has a maximum of 5 steps when using PATH_TREE or SINGLE_PATH visualization\n- event lists should use canonical event objects with "event_type", "filters", and "group_by"\n- include a descriptive top-level "name" whenever possible\n\nMINIMAL EXAMPLES:\n- eventsSegmentation (default line):\n  {"type":"eventsSegmentation","app":"123","name":"Active Users Last 30 Days","params":{"range":"Last 30 Days","events":[{"event_type":"_active","filters":[],"group_by":[]}],"metric":"uniques","countGroup":"User","groupBy":[],"interval":1,"segments":[{"conditions":[]}]}}\n- eventsSegmentation as bar chart (user said "show as a bar chart"):\n  {"type":"eventsSegmentation","app":"123","name":"Purchases by Country","vis":"bar","params":{"range":"Last 30 Days","events":[{"event_type":"Purchase","filters":[],"group_by":[{"type":"event","value":"country"}]}],"metric":"totals","countGroup":"User","groupBy":[],"interval":1,"segments":[{"conditions":[]}]}}\n- funnels:\n  {"type":"funnels","app":"123","name":"Signup Funnel","params":{"range":"Last 30 Days","events":[{"event_type":"View Signup","filters":[],"group_by":[]},{"event_type":"Complete Signup","filters":[],"group_by":[]}],"countGroup":"User","segments":[{"conditions":[]}]}}\n- revenueLtv (cumulative revenue from users NEW in the selected date range — empty results usually mean no new users were acquired in the period, not broken revenue instrumentation):\n  {"type":"revenueLtv","app":"123","name":"Revenue LTV - Total Revenue","vis":"line","params":{"range":"Last 90 Days","metric":"2","event":{"event_type":"_any_revenue_event","filters":[],"group_by":[]},"revenueProperty":"$revenue","groupBy":[],"countGroup":"User","interval":1,"segments":[{"conditions":[]}]}}'
        )
        .optional(),
      groupByLimit: z
        .number()
        .min(1)
        .max(1000)
        .describe('Maximum number of group by values to return (1-1000, defaults to 10)')
        .optional(),
      excludeIncompleteDatapoints: z
        .boolean()
        .describe(
          'Optional flag to exclude incomplete data points from results. When true, the current time interval will be excluded from the results to avoid incomplete data points. Defaults to false.'
        )
        .optional(),
      chartId: z
        .string()
        .describe(
          "Optional parent chart ID for modify/fork. When provided, the parent chart's params (segments, filters, countGroup, groupBy, etc.) are used as defaults — only params you explicitly provide will override. Typical modify flow: get_amplitude_charts include='typed' → edit `chart` → query_amplitude_data({ chart, chartId })."
        )
        .optional(),
      timeSeriesLimit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .describe(
          'Maximum number of group-by values that include per-interval time-series rows in the CSV response. All group-by values always include their aggregate "Total" row. Groups beyond this limit only return their Total row, which dramatically reduces response size for charts with many group-by values over long date ranges. Set to 0 for totals-only. Defaults to 3.'
        )
        .optional(),
      includeAdditionalInfo: z
        .array(z.enum(['chartConfig']))
        .describe(
          'Additional render-only information to include. Omit for compact analytics data.'
        )
        .optional(),
      chart: z
        .union([
          z
            .object({
              kind: z.literal('segmentation'),
              events: z
                .array(
                  z.union([
                    z
                      .object({
                        object_type: z
                          .enum(['INLINE_CUSTOM_EVENT', 'COMPARISON_EVENT'])
                          .describe(
                            'INLINE_CUSTOM_EVENT: any of the members counts. COMPARISON_EVENT: members compared together.'
                          ),
                        event: z
                          .string()
                          .describe(
                            "Label for the composite (usually the first member's name)"
                          ),
                        members: z
                          .array(
                            z
                              .object({
                                event: z.string().describe("Event name, e.g. 'Page Viewed'"),
                                where: z
                                  .array(
                                    z
                                      .object({
                                        property: z
                                          .string()
                                          .describe("Property name, e.g. 'platform'"),
                                        op: z
                                          .string()
                                          .describe(
                                            "Operator: is, is not, contains, does not contain, has prefix, does not have prefix, greater, less, greater or equal, less or equal, glob match, glob does not match, set contains, set does not contain. There is no presence operator — for \"has a value\" use op 'is not' with values ['(none)'], and for \"is unset\" use op 'is' with values ['(none)']. Use 'has prefix' for prefix matching and 'glob match' for wildcard patterns; there is no 'starts with', 'matches', or 'regex'."
                                          )
                                          .optional(),
                                        values: z.array(z.string()).optional(),
                                        scope: z
                                          .string()
                                          .describe(
                                            "Property scope: event | user | group | session; derived (computed) properties use 'derivedV2'. Use the scope taxonomy search returned for the property — do not guess."
                                          )
                                          .optional(),
                                        group_type: z
                                          .string()
                                          .describe(
                                            "Group entity for group-scoped props (e.g. 'org id', 'org name'); ignored otherwise"
                                          )
                                          .optional()
                                      })
                                      .strict()
                                      .describe(
                                        "A property filter (UI: '+ Filter by' / a segment condition)"
                                      )
                                  )
                                  .optional(),
                                group_by: z
                                  .array(
                                    z
                                      .object({
                                        property: z.string(),
                                        scope: z
                                          .string()
                                          .describe(
                                            "Property scope: event | user | group | session; derived (computed) properties use 'derivedV2'. Use the scope taxonomy search returned for the property — do not guess."
                                          )
                                          .optional(),
                                        group_type: z
                                          .string()
                                          .describe(
                                            "Group entity for group-scoped breakdowns (e.g. 'org id')"
                                          )
                                          .optional()
                                      })
                                      .strict()
                                      .describe("A breakdown property (UI: '+ Group-by')")
                                  )
                                  .optional()
                              })
                              .strict()
                              .describe("A measured event (UI: '+ Add Event')")
                          )
                          .min(1)
                          .describe('Constituent events'),
                        where: z.array(z.unknown()).optional(),
                        group_by: z.array(z.unknown()).optional()
                      })
                      .strict()
                      .describe('An event built from several constituent events in one slot'),
                    z.unknown()
                  ])
                )
                .min(1),
              measured_as: z
                .object({
                  as_: z
                    .string()
                    .optional()
                    .describe(
                      'Compatibility alias returned by typed chart reads. Prefer as for new charts.'
                    ),
                  as: z
                    .string()
                    .describe(
                      'Measured-as: unique_users | event_totals | active_pct | avg_per_user | frequency | formula | property_sum | property_avg | property_min | property_max | property_median | property_count | property_count_avg | histogram. Property aggregations and histogram need the aggregated property in the event group_by.'
                    )
                    .optional(),
                  formula: z
                    .string()
                    .describe(
                      "Expression when as == 'formula'. UPPERCASE functions (UNIQUES, TOTALS, PROPSUM, PERCENTILE, …), events referenced as A, B, C in listed order."
                    )
                    .optional(),
                  histogram_bin: z
                    .object({
                      min: z.number().int().nullable().optional(),
                      max: z.number().int().nullable().optional(),
                      size: z.number().int().nullable().optional()
                    })
                    .strict()
                    .describe("Bin config when as == 'histogram'")
                    .optional()
                })
                .strict()
                .describe("How the events are measured (UI: 'Measured as')")
                .optional(),
              count_unique_by: z
                .string()
                .describe("countGroup, e.g. 'User' or 'org id'")
                .optional(),
              group_by: z.array(z.unknown()).optional(),
              segments: z
                .array(
                  z
                    .object({
                      where: z.array(z.unknown()).optional(),
                      performed: z
                        .array(
                          z
                            .object({
                              kind: z.literal('performed').optional(),
                              event: z.string(),
                              op: z
                                .string()
                                .describe('Count comparison: >=, <=, >, <, =')
                                .optional(),
                              count: z.number().int().optional(),
                              time_type: z
                                .string()
                                .describe(
                                  "Behavioral window mode, e.g. 'forEachInterval' or 'rolling' (with time_value = lookback days)"
                                )
                                .optional(),
                              time_value: z
                                .union([z.number(), z.array(z.number())])
                                .optional(),
                              where: z.array(z.unknown()).optional(),
                              exclude_current_interval: z.boolean().optional()
                            })
                            .strict()
                            .describe(
                              "A behavioral segment condition (UI: '+ Performed'): users who did an event {op} {count} times in a window"
                            )
                        )
                        .optional()
                    })
                    .strict()
                    .describe(
                      "A user population (UI: 'Segment by'): property conditions AND behaviors"
                    )
                )
                .optional(),
              date_range: z
                .object({
                  relative: z
                    .string()
                    .describe("Relative window, e.g. 'Last 30 Days', 'Last 12 Weeks'")
                    .optional(),
                  start: z.number().describe('Absolute start (epoch seconds)').optional(),
                  end: z
                    .number()
                    .describe("Absolute end (epoch seconds); omit for 'up to now'")
                    .optional(),
                  timezone: z
                    .string()
                    .describe(
                      "IANA timezone the window is anchored in (e.g. 'America/Los_Angeles'); omit for project default"
                    )
                    .optional()
                })
                .strict()
                .describe(
                  'Time window — REQUIRED, set from the request. Either a relative window OR start(/end), never both.'
                ),
              interval: z
                .string()
                .describe(
                  'five_minute | hour | day | week | month | quarter. Sub-daily intervals only allow short windows (hour ≤ 8 days, five_minute ≤ 2 days).'
                )
                .optional(),
              rolling_window: z
                .number()
                .int()
                .describe("Rolling-window size in days (UI: 'rolling N days')")
                .optional(),
              cumulative: z
                .boolean()
                .describe('Cumulative running total over the range')
                .optional(),
              period_over_period: z
                .string()
                .describe(
                  "Compare each series to a prior period: 'period' (same-length window immediately before) | 'parent' | 'grandparent' | 'quarter'. Omit for no comparison."
                )
                .optional(),
              vis: z
                .string()
                .describe('Visualization: line | bar | area | stackedbar | pie | kpi')
                .optional(),
              name: z.string().describe('Chart title').optional()
            })
            .strict(),
          z
            .object({
              kind: z.literal('funnel'),
              steps: z
                .array(z.unknown())
                .min(2)
                .describe('Ordered funnel steps (each is an event or composite event)'),
              conversion_window: z
                .object({
                  value: z.number().int().gt(0).describe('Window length, e.g. 7'),
                  unit: z.enum(['second', 'minute', 'hour', 'day', 'week'])
                })
                .strict()
                .describe("How long a user has to complete the funnel (UI: 'convert within')"),
              measured_as: z
                .object({
                  as_: z
                    .string()
                    .optional()
                    .describe(
                      'Compatibility alias returned by typed chart reads. Prefer as for new charts.'
                    ),
                  as: z
                    .string()
                    .describe(
                      'conversion | conversion_over_time | time_to_convert | time_to_convert_over_time | step_count'
                    )
                    .optional()
                })
                .strict()
                .optional(),
              mode: z.enum(['ordered', 'unordered', 'sequential']).optional(),
              hold_property: z
                .object({
                  property: z.string().describe('Property to hold constant across steps'),
                  scope: z
                    .string()
                    .describe(
                      "Property scope: event | user | group | session; derived (computed) properties use 'derivedV2'. Use the scope taxonomy search returned for the property — do not guess."
                    )
                    .optional(),
                  on_step: z
                    .number()
                    .int()
                    .describe('Step index the property is anchored on')
                    .optional()
                })
                .strict()
                .describe(
                  "Hold a property constant across steps (UI: 'hold property constant')"
                )
                .optional(),
              constant_properties: z
                .array(z.unknown())
                .describe(
                  'Properties whose values must match across steps, e.g. session_id for same-session funnels'
                )
                .optional(),
              excluded_events: z
                .array(
                  z
                    .object({
                      event: z.unknown(),
                      step_index: z
                        .number()
                        .int()
                        .describe('-1 means global exclusion across all steps')
                        .optional()
                    })
                    .strict()
                )
                .optional(),
              count_unique_by: z.string().optional(),
              group_by: z.array(z.unknown()).optional(),
              segments: z.array(z.unknown()).optional(),
              date_range: z.unknown(),
              interval: z.string().optional(),
              vis: z.string().describe('Visualization: bar | line | over-time').optional(),
              name: z.string().optional(),
              trans_time_percentiles: z
                .array(z.number().int().min(1).max(99))
                .describe(
                  'Optional on measured_as.as == time_to_convert. Omit for the default percentile series [25, 75, 90, 95, 99]. To request a non-default percentile, append one custom integer rank from 1 through 99. Use medianTransTimes from the response for p50 / median — do not add 50. Only valid when the org has feature ttc-funnel-expanded-percentiles; omit otherwise (Dash/Langley reject it when the feature is off).'
                )
                .optional()
            })
            .strict(),
          z
            .object({
              kind: z.literal('retention'),
              start_event: z
                .union([z.unknown(), z.unknown()])
                .describe("Cohort-entry event ('_new' for new users)"),
              return_events: z
                .array(z.unknown())
                .min(1)
                .describe("Return behavior (OR-combined; '_active' for any activity)"),
              retention_method: z
                .enum(['rolling', 'nday', 'bracket', 'nday_or_before'])
                .describe(
                  'rolling = on/after day N; nday = exactly day N; bracket = custom day brackets; nday_or_before = on/before day N'
                )
                .optional(),
              measured_as: z.enum(['retention', 'usage_interval']).optional(),
              retention_brackets: z
                .array(z.array(z.number().int()))
                .describe('Custom day brackets, e.g. [[0,7],[7,14]]; omit for default')
                .optional(),
              count_unique_by: z.string().optional(),
              group_by: z.array(z.unknown()).optional(),
              segments: z.array(z.unknown()).optional(),
              date_range: z.unknown(),
              interval: z.string().optional(),
              vis: z.string().describe('Visualization: line | bar').optional(),
              name: z.string().optional()
            })
            .strict(),
          z
            .object({
              kind: z.literal('sessions'),
              measured_as: z
                .enum([
                  'totalSessions',
                  'average',
                  'length',
                  'peruser',
                  'totalTime',
                  'averageTimePerUser',
                  'averageEventsPerSession',
                  'totalEvents',
                  'eventCountDistribution',
                  'formula'
                ])
                .describe('Session metric (UI: Measured as)')
                .optional(),
              formula: z
                .string()
                .describe("Formula expression when measured_as == 'formula'")
                .optional(),
              groups: z
                .array(
                  z
                    .object({
                      session_filter: z
                        .object({})
                        .passthrough()
                        .describe(
                          'Optional session filter (advanced; see the sessions schema from Langley)'
                        )
                        .optional(),
                      group_by: z.array(z.unknown()).optional(),
                      aggregations: z.array(z.object({}).passthrough()).optional()
                    })
                    .strict()
                )
                .describe(
                  'Session series: an optional session filter + breakdown + aggregations. Omit for one unfiltered series.'
                )
                .optional(),
              group_by: z.array(z.unknown()).describe('Chart-level breakdown').optional(),
              count_unique_by: z.string().optional(),
              segments: z.array(z.unknown()).optional(),
              date_range: z.unknown(),
              interval: z.string().optional(),
              vis: z.string().describe('Visualization: line | bar').optional(),
              name: z.string().optional()
            })
            .strict(),
          z
            .object({
              kind: z.literal('data_table'),
              columns: z
                .array(
                  z
                    .object({
                      metric_type: z
                        .string()
                        .describe(
                          'UNIQUES | TOTALS | FORMULA | SESSIONS | CONVERSION | PROPSUM | PROPAVG | PROPMAX | PROPMIN | DEFAULT_* presets'
                        ),
                      where: z.array(z.unknown()).describe('Column-level filters').optional(),
                      event: z
                        .union([
                          z.string(),
                          z.number(),
                          z.boolean(),
                          z.object({}).passthrough(),
                          z.array(z.unknown())
                        ])
                        .describe('Event for single-event metrics')
                        .optional(),
                      events: z
                        .array(z.unknown())
                        .describe('Events for FORMULA / CONVERSION (ordered steps)')
                        .optional(),
                      formula: z.string().describe('Expression for FORMULA').optional(),
                      aggregation_property: z
                        .string()
                        .describe('Property for PROP* metrics')
                        .optional(),
                      aggregation_scope: z
                        .string()
                        .describe(
                          "Property scope: event | user | group | session; derived (computed) properties use 'derivedV2'. Use the scope taxonomy search returned for the property — do not guess."
                        )
                        .optional(),
                      totals_type: z.string().describe('TOTALS sub-type').optional(),
                      count_unique_by: z.string().optional(),
                      session_measure: z
                        .string()
                        .describe(
                          'Session measure for SESSIONS metric: TOTALS | AVERAGE_SESSION_DURATION | SESSIONS_PER_USER | BOUNCE_RATE | ENTRIES | ENTRY_RATE | EXITS | EXIT_RATE | UNIQUE_PAGE_VIEWS | PAGE_VIEWS_PER_SESSION | FORMULA'
                        )
                        .optional(),
                      conversion_seconds: z
                        .number()
                        .int()
                        .describe('CONVERSION window in seconds')
                        .optional(),
                      conversion_mode: z.string().optional()
                    })
                    .strict()
                    .describe('One metric column of the table')
                )
                .min(1),
              rows: z
                .array(
                  z
                    .object({
                      kind: z.enum(['property', 'time']).optional(),
                      property: z
                        .string()
                        .describe('Property name (kind=property)')
                        .optional(),
                      scope: z
                        .string()
                        .describe(
                          "Property scope: event | user | group | session; derived (computed) properties use 'derivedV2'. Use the scope taxonomy search returned for the property — do not guess."
                        )
                        .optional(),
                      group_type: z.string().optional(),
                      interval: z
                        .string()
                        .describe('Bucket token (kind=time): day/week/month/…')
                        .optional(),
                      where: z
                        .array(z.unknown())
                        .describe('Filters on this dimension')
                        .optional()
                    })
                    .strict()
                )
                .describe('Row breakdown dimensions')
                .optional(),
              group_by: z.array(z.unknown()).optional(),
              count_unique_by: z.string().optional(),
              segments: z.array(z.unknown()).optional(),
              date_range: z.unknown(),
              interval: z.string().optional(),
              name: z.string().optional()
            })
            .strict()
        ])
        .describe(
          'PREFERRED. Typed, UI-shaped chart parameters, discriminated on `kind` (segmentation | funnel | retention | sessions | data_table). Compiled server-side into a validated definition — no raw definition JSON needed. Provide exactly one of `chart` or `definition`.'
        )
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  render_amplitude_chart: z
    .object({
      chartId: z
        .string()
        .min(1)
        .describe('Saved chart ID to render (e.g. from search or get_from_url).')
        .optional(),
      chartEditId: z
        .string()
        .min(1)
        .describe(
          'Chart edit ID to render. Returned by query_amplitude_data, or parsed from links ending in /chart/new/<edit_id> or /chart/<chart_id>/edit/<edit_id>.'
        )
        .optional(),
      title: z
        .string()
        .min(1)
        .describe(
          'Chart title to display. Pass the title returned by query_amplitude_data when rendering a chart edit.'
        )
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  save_chart_edits: z
    .object({
      charts: z
        .array(
          z
            .object({
              editId: z.string().describe('Chart edit ID to save'),
              name: z.string().describe('Name for the saved chart'),
              description: z.string().describe('Description for the saved chart')
            })
            .strict()
        )
        .min(1)
        .describe('Array of chart edits to save with name and description for each'),
      destination: z
        .union([
          z
            .object({
              kind: z
                .literal('personal')
                .describe("Save to the caller's personal space (default).")
            })
            .strict(),
          z
            .object({
              kind: z.literal('space'),
              spaceId: z
                .string()
                .min(1)
                .describe(
                  'Target shared space ID. Get it from the user or a shared-space URL (/analytics/{org}/space/{spaceId}). There is no list-spaces action — do not invent an id. To create a space or move already-saved content, use manage_amp_entities.'
                ),
              publish: z
                .boolean()
                .describe(
                  'Whether the object is discoverable by others in that space. Defaults to true — an unpublished object in a shared space stays invisible to teammates.'
                )
                .optional(),
              notify: z
                .boolean()
                .describe(
                  'Whether to notify space members that the object was added. Defaults to true.'
                )
                .optional()
            })
            .strict()
        ])
        .describe('Where to save. Omit for the personal space (previous behavior).')
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  rename_chart: z
    .object({
      chartId: z
        .string()
        .min(1)
        .describe('ID of the saved chart to rename (e.g. from /chart/abc123)'),
      name: z.string().min(1).describe('New name for the chart'),
      description: z
        .string()
        .describe('New description. Omit to leave the existing one untouched')
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  get_amplitude_context: z
    .object({
      projectId: z
        .string()
        .min(1)
        .describe(
          'Project ID from get_amplitude_context. Omit to discover your user, organization, and accessible projects. Call get_amplitude_context to discover accessible project IDs.'
        )
        .optional(),
      listContextDocuments: z
        .boolean()
        .describe(
          "When true, adds contextDocuments: titles and ids of the customer's uploaded context files (no file contents). Without projectId lists org-level documents; with projectId also includes that project's documents. Omit at session start."
        )
        .optional(),
      searchContextDocuments: z
        .string()
        .min(1)
        .describe(
          "Semantic search query over the contents of uploaded context documents. Adds contextDocumentSearch with matching text snippets. Without projectId searches org-level documents; with projectId also searches that project's documents."
        )
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  use_amplitude_chart_monitors: z
    .object({
      action: z
        .enum(['get_alerts', 'get_config', 'history', 'subscribe', 'unsubscribe', 'update'])
        .describe(
          "What to do: 'get_alerts' (default), 'get_config', 'history', 'subscribe', 'unsubscribe', or 'update'."
        )
        .optional(),
      chartId: z
        .string()
        .min(1)
        .describe(
          'Chart ID. Scopes get_alerts to one chart; required for get_config; optional for history (resolves monitorId).'
        )
        .optional(),
      projectId: z
        .string()
        .min(1)
        .describe(
          'Project ID for get_alerts (optional with single-project access). Call get_amplitude_context to discover accessible project IDs.'
        )
        .optional(),
      limit: z
        .number()
        .int()
        .max(100)
        .gt(0)
        .describe('get_alerts: max alerts to return (1-100, default 20).')
        .optional(),
      includeUnseen: z
        .boolean()
        .describe('get_alerts: return only alerts not yet marked seen.')
        .optional(),
      monitorId: z
        .string()
        .min(1)
        .describe(
          'history / subscribe / unsubscribe / update: the monitor to act on. For history, chartId is an alternative to monitorId.'
        )
        .optional(),
      deliveryMethod: z
        .enum(['email', 'slack', 'teams'])
        .describe('subscribe / unsubscribe: delivery method (email, slack, or teams).')
        .optional(),
      deliveryChannel: z
        .string()
        .min(1)
        .describe(
          'subscribe / unsubscribe: Slack channel ID or Teams conversation ID (omit for email).'
        )
        .optional(),
      deliveryWorkspaceId: z
        .string()
        .min(1)
        .describe(
          'subscribe / unsubscribe: optional workspace/tenant context for Slack or Teams.'
        )
        .optional(),
      enabled: z
        .boolean()
        .describe('update: true enables the monitor, false disables it.')
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  use_amp_dashboards: z
    .object({
      action: z
        .enum([
          'get',
          'create',
          'edit',
          'replace_properties',
          'subscribe',
          'edit_subscription'
        ])
        .describe(
          'Discriminator: determines which set of parameters applies (get | create | edit | replace_properties | subscribe | edit_subscription)'
        ),
      dashboardIds: z
        .array(z.string().min(1).describe('Amplitude dashboard ID (e.g. "abc1234").'))
        .min(1)
        .max(3)
        .describe(
          "Dashboard IDs to read (array of 1 to 3 strings, e.g. ['abc1234']). Resolve with search (entityTypes: ['DASHBOARD'])."
        )
        .optional(),
      name: z.string().min(1).describe('Dashboard name.').optional(),
      description: z.string().describe('Dashboard description.').optional(),
      rows: z
        .array(
          z
            .object({
              height: z
                .number()
                .describe('Row height in pixels. Allowed values: 375, 500, 625, 750.'),
              items: z
                .array(
                  z
                    .object({
                      id: z
                        .union([z.string(), z.number()])
                        .describe(
                          'Item ID (returned from get operations, useful for future updates)'
                        )
                        .optional(),
                      type: z
                        .enum([
                          'chart',
                          'rich_text',
                          'session_replay',
                          'video',
                          'image',
                          'cohort'
                        ])
                        .describe('Content type'),
                      width: z
                        .number()
                        .min(3)
                        .max(12)
                        .describe(
                          'Width in columns (3-12). If omitted, item auto-fills remaining space equally with other auto-width items.'
                        )
                        .optional(),
                      content: z
                        .string()
                        .describe('Rich text content as markdown (for rich_text type)')
                        .optional(),
                      chartId: z
                        .string()
                        .describe(
                          'Saved chart ID (required when type is "chart"). IMPORTANT: Must be a permanent chartId from save_chart_edits or create_chart, NOT an editId from query_amplitude_data. Using an editId will cause "NotFoundError: No chart".'
                        )
                        .optional(),
                      sessionReplayIdentifier: z
                        .string()
                        .describe('Session replay identifier (for session_replay type)')
                        .optional(),
                      note: z
                        .string()
                        .describe('Optional note (for session_replay type)')
                        .optional(),
                      videoUrl: z.string().describe('Video URL (for video type)').optional(),
                      imageS3Key: z
                        .string()
                        .describe('S3 key for image (for image type)')
                        .optional(),
                      title: z.string().describe('Title (for video/image types)').optional(),
                      cohortId: z.string().describe('Cohort ID (for cohort type)').optional(),
                      hideChart: z
                        .boolean()
                        .describe('Whether to hide visualization (defaults to false)')
                        .optional()
                    })
                    .strict()
                )
                .min(1)
                .max(4)
                .describe('Items in this row (left-to-right order, max 4 items)')
            })
            .strict()
        )
        .min(1)
        .describe(
          'Dashboard layout rows. Item chartId accepts a saved chart ID or a temporary chart edit ID; edit IDs are saved automatically.'
        )
        .optional(),
      chartEdits: z
        .array(
          z
            .object({
              editId: z
                .string()
                .min(1)
                .describe('Temporary chart edit ID from query_amplitude_data.'),
              name: z.string().min(1).describe('Name for the permanent saved chart.'),
              description: z.string().describe('Description for the permanent saved chart.')
            })
            .strict()
        )
        .describe(
          'Optional names and descriptions for chart edits referenced in rows. Without an entry, an edit referenced in rows is saved using the name from its definition.'
        )
        .optional(),
      chartMetas: z
        .object({})
        .catchall(
          z
            .object({
              view: z
                .enum([
                  'series',
                  'table',
                  'headline',
                  'converted',
                  'dropoff',
                  'sequences',
                  'metric_only',
                  'metrics_with_previous_data',
                  'table_metrics',
                  'target_metrics'
                ])
                .describe(
                  'Chart display view: "series" for line/bar charts, "table" for data tables, "headline" for key metrics, "converted" for conversion funnels'
                )
                .optional(),
              annotation: z
                .string()
                .describe('Optional annotation text to display on the chart')
                .optional(),
              selectedSerieIndex: z
                .number()
                .describe(
                  'Index of the selected data series (0-based) for multi-series charts'
                )
                .optional()
            })
            .strict()
        )
        .describe('Optional display configuration keyed by saved chart ID.')
        .optional(),
      destination: z
        .union([
          z
            .object({
              kind: z
                .literal('personal')
                .describe("Save to the caller's personal space (default).")
            })
            .strict(),
          z
            .object({
              kind: z.literal('space'),
              spaceId: z
                .string()
                .min(1)
                .describe(
                  'Target shared space ID. Get it from the user or a shared-space URL (/analytics/{org}/space/{spaceId}). There is no list-spaces action — do not invent an id. To create a space or move already-saved content, use manage_amp_entities.'
                ),
              publish: z
                .boolean()
                .describe(
                  'Whether the object is discoverable by others in that space. Defaults to true — an unpublished object in a shared space stays invisible to teammates.'
                )
                .optional(),
              notify: z
                .boolean()
                .describe(
                  'Whether to notify space members that the object was added. Defaults to true.'
                )
                .optional()
            })
            .strict()
        ])
        .describe('Where to save. Omit for the personal space (previous behavior).')
        .optional(),
      dashboardId: z
        .string()
        .min(1)
        .describe(
          "Dashboard ID. Resolve dashboard IDs with search (entityTypes: ['DASHBOARD'])."
        )
        .optional(),
      expectedLastModified: z
        .number()
        .int()
        .describe('lastModified returned by get. Read the dashboard first.')
        .optional(),
      metadata: z
        .object({ name: z.string().min(1).optional(), description: z.string().optional() })
        .strict()
        .describe('Dashboard metadata updates.')
        .optional(),
      edit: z
        .union([
          z
            .object({
              type: z.literal('set_rows'),
              rows: z
                .array(z.unknown())
                .min(1)
                .describe('Replace all dashboard rows with this full rows array.')
            })
            .strict(),
          z
            .object({
              type: z.literal('update_row'),
              rowIndex: z
                .number()
                .int()
                .min(0)
                .describe('Zero-based index of row to replace.'),
              row: z.unknown()
            })
            .strict(),
          z
            .object({
              type: z.literal('insert_row'),
              index: z
                .number()
                .int()
                .min(0)
                .describe(
                  'Zero-based insertion index. May equal current row count to append.'
                ),
              row: z.unknown()
            })
            .strict(),
          z
            .object({
              type: z.literal('remove_row'),
              rowIndex: z.number().int().min(0).describe('Zero-based index of row to remove.')
            })
            .strict()
        ])
        .describe('One layout operation from the dashboard returned by get.')
        .optional(),
      replacements: z
        .array(
          z
            .object({
              sourcePropertyKey: z
                .string()
                .describe('Key identifying the source property from the discovery response.'),
              target: z
                .object({
                  elementType: z
                    .string()
                    .describe('New property name (e.g. "region", "city").'),
                  propertyType: z
                    .string()
                    .describe(
                      'New property type (e.g. "event", "user"). Defaults to source value.'
                    )
                    .optional(),
                  operator: z
                    .string()
                    .describe('New filter operator (e.g. "is", "is not"). Defaults to source.')
                    .optional(),
                  values: z
                    .array(z.string())
                    .describe('New filter values. Defaults to source values.')
                    .optional(),
                  groupType: z
                    .string()
                    .describe('New group type. Defaults to source.')
                    .optional(),
                  dataModel: z
                    .string()
                    .describe('New data model. Defaults to source.')
                    .optional()
                })
                .strict()
                .describe('Target property attributes.')
            })
            .strict()
        )
        .min(1)
        .max(20)
        .describe('Array of replacement definitions from discovery mode.')
        .optional(),
      dryRun: z.boolean().describe('Preview changes without saving.').optional(),
      confirmSharedChartImpact: z
        .boolean()
        .describe('Confirm updates to charts used elsewhere.')
        .optional(),
      notificationType: z
        .enum(['email', 'slack', 'teams'])
        .describe('Delivery channel.')
        .optional(),
      email: z
        .string()
        .describe("Email recipient. Defaults to the current user's email when omitted.")
        .optional(),
      attachCsv: z.boolean().describe('Attach CSV to email deliveries.').optional(),
      recipientType: z
        .enum(['channel', 'user'])
        .describe('Slack or Teams recipient type.')
        .optional(),
      recipientId: z.string().min(1).describe('Slack or Teams recipient ID.').optional(),
      recipientTeamId: z.string().min(1).describe('Teams team ID.').optional(),
      sendWeek: z
        .enum(['every', 'first', 'second', 'third', 'last'])
        .describe('Delivery cadence week.')
        .optional(),
      sendDay: z
        .enum([
          'every',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday'
        ])
        .describe('Delivery weekday.')
        .optional(),
      sendHourUtc: z.number().int().min(0).max(23).describe('UTC delivery hour.').optional(),
      subscriptionId: z.string().min(1).describe('Subscription ID.').optional()
    })
    .strict(),
  use_amp_notebooks: z
    .object({
      action: z
        .enum(['get', 'create', 'edit'])
        .describe(
          'Discriminator: determines which set of parameters applies (get | create | edit)'
        ),
      notebookIds: z
        .array(z.string().min(1))
        .min(1)
        .describe("Notebook IDs to read. Resolve with search (entityTypes: ['NOTEBOOK']).")
        .optional(),
      notebookId: z
        .string()
        .min(1)
        .describe('Singular notebook ID alias for notebookIds:[id].')
        .optional(),
      name: z.string().min(1).describe('Notebook name.').optional(),
      rows: z
        .array(
          z
            .object({
              id: z
                .union([z.string(), z.number()])
                .describe(
                  'Optional row ID for backend ordering (string for grid layout IDs, number for legacy)'
                )
                .optional(),
              items: z
                .array(
                  z
                    .object({
                      id: z
                        .union([z.string(), z.number()])
                        .describe(
                          'Item ID (returned from get operations, useful for future updates)'
                        )
                        .optional(),
                      type: z
                        .enum([
                          'chart',
                          'rich_text',
                          'session_replay',
                          'video',
                          'image',
                          'cohort'
                        ])
                        .describe('Content type'),
                      width: z
                        .number()
                        .min(3)
                        .max(12)
                        .describe(
                          'Width in columns (3-12). If omitted, item auto-fills remaining space equally with other auto-width items.'
                        )
                        .optional(),
                      content: z
                        .string()
                        .describe('Rich text content as markdown (for rich_text type)')
                        .optional(),
                      chartId: z
                        .string()
                        .describe(
                          'Saved chart ID (required when type is "chart"). IMPORTANT: Must be a permanent chartId from save_chart_edits or create_chart, NOT an editId from query_amplitude_data. Using an editId will cause "NotFoundError: No chart".'
                        )
                        .optional(),
                      sessionReplayIdentifier: z
                        .string()
                        .describe('Session replay identifier (for session_replay type)')
                        .optional(),
                      note: z
                        .string()
                        .describe('Optional note (for session_replay type)')
                        .optional(),
                      videoUrl: z.string().describe('Video URL (for video type)').optional(),
                      imageS3Key: z
                        .string()
                        .describe('S3 key for image (for image type)')
                        .optional(),
                      title: z.string().describe('Title (for video/image types)').optional(),
                      cohortId: z.string().describe('Cohort ID (for cohort type)').optional(),
                      hideChart: z
                        .boolean()
                        .describe('Whether to hide visualization (defaults to false)')
                        .optional()
                    })
                    .strict()
                )
                .min(1)
                .max(4)
                .describe('Items in this row (left-to-right order, max 4 items)')
            })
            .strict()
        )
        .min(1)
        .describe('Notebook layout rows.')
        .optional(),
      destination: z
        .union([
          z
            .object({
              kind: z
                .literal('personal')
                .describe("Save to the caller's personal space (default).")
            })
            .strict(),
          z
            .object({
              kind: z.literal('space'),
              spaceId: z
                .string()
                .min(1)
                .describe(
                  'Target shared space ID. Get it from the user or a shared-space URL (/analytics/{org}/space/{spaceId}). There is no list-spaces action — do not invent an id. To create a space or move already-saved content, use manage_amp_entities.'
                ),
              publish: z
                .boolean()
                .describe(
                  'Whether the object is discoverable by others in that space. Defaults to true — an unpublished object in a shared space stays invisible to teammates.'
                )
                .optional(),
              notify: z
                .boolean()
                .describe(
                  'Whether to notify space members that the object was added. Defaults to true.'
                )
                .optional()
            })
            .strict()
        ])
        .describe('Where to save. Omit for the personal space (previous behavior).')
        .optional(),
      expectedLastModifiedAt: z
        .number()
        .int()
        .describe('lastModifiedAt returned by get. Read the notebook first.')
        .optional(),
      metadata: z
        .object({
          name: z
            .string()
            .min(1)
            .max(255)
            .nullable()
            .describe('Optional notebook name update. Applied only when not null/undefined.')
            .optional()
        })
        .strict()
        .describe('Optional metadata updates (e.g. name).')
        .optional(),
      edit: z
        .union([
          z
            .object({
              type: z.literal('set_rows'),
              rows: z
                .array(z.unknown())
                .min(1)
                .describe('Replace all notebook rows with this full rows array.')
            })
            .strict(),
          z
            .object({
              type: z.literal('update_row'),
              rowIndex: z
                .number()
                .int()
                .min(0)
                .describe('Zero-based index of row to replace.'),
              row: z.unknown()
            })
            .strict(),
          z
            .object({
              type: z.literal('insert_row'),
              index: z
                .number()
                .int()
                .min(0)
                .describe(
                  'Zero-based insertion index. May equal current row count to append.'
                ),
              row: z.unknown()
            })
            .strict(),
          z
            .object({
              type: z.literal('remove_row'),
              rowIndex: z.number().int().min(0).describe('Zero-based index of row to remove.')
            })
            .strict()
        ])
        .describe('Optional single structural layout edit.')
        .optional()
    })
    .strict(),
  get_experiments: z
    .object({
      ids: z.array(z.string()).min(1).describe('get: experiment IDs to retrieve.'),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  query_experiment: z
    .object({
      id: z.string().regex(/^\d+$/).describe('analyze: experiment ID to query.'),
      metricIds: z
        .array(z.string())
        .max(10)
        .describe(
          'analyze: ONLY if the user explicitly requests specific or all metrics. Omit for primary/recommended metric only.'
        )
        .optional(),
      groupBy: z
        .array(
          z
            .object({
              type: z
                .enum([
                  'user',
                  'event',
                  'session',
                  'group',
                  'nova_props',
                  'derived',
                  'derivedV2',
                  'lookup',
                  'array_property_aggregation',
                  'inline_derived',
                  'parallel_semantic',
                  'nth_time_hack',
                  'day_time_prop',
                  'user_state',
                  'server_upload_delay',
                  'catalog_event',
                  'catalog_user',
                  'user_property_value',
                  'persistence',
                  'field',
                  'table_column'
                ])
                .describe(
                  'FilterPropTypes — property source. Same enum as groupBy.type, filter subprop_type, and segment prop_type.'
                ),
              value: z.string().describe('Property name from project taxonomy'),
              group_type: z
                .string()
                .describe('Group context, e.g. "User" or an account-level group id')
            })
            .strict()
        )
        .max(1)
        .describe(
          'analyze: optional group-by, e.g. [{"type":"user","value":"device type","group_type":"User"}].'
        )
        .optional(),
      filters: z
        .array(
          z
            .object({
              group_type: z
                .string()
                .describe('Group context, e.g. "User" or an account-level group id'),
              subprop_key: z.string().describe('Property name from project taxonomy'),
              subprop_op: z
                .enum([
                  'is',
                  'is not',
                  'contains',
                  'does not contain',
                  'less',
                  'less or equal',
                  'greater',
                  'greater or equal',
                  'set is',
                  'set is not',
                  'set contains',
                  'set does not contain',
                  'glob match',
                  'glob does not match',
                  'has prefix',
                  'does not have prefix',
                  'ends with',
                  'version less than',
                  'version less than or equal to',
                  'version greater than',
                  'version greater than or equal to',
                  'css match',
                  'autotrack css match'
                ])
                .describe(
                  'PropertyOperator — filter operator. One of: is, is not, contains, does not contain, less, less or equal, greater, greater or equal, set is, set is not, set contains, set does not contain, glob match, glob does not match, has prefix, does not have prefix, ends with, version less than, version less than or equal to, version greater than, version greater than or equal to, css match, autotrack css match.'
                ),
              subprop_value: z.array(z.string()).describe('Values to match'),
              subprop_type: z
                .enum([
                  'user',
                  'event',
                  'session',
                  'group',
                  'nova_props',
                  'derived',
                  'derivedV2',
                  'lookup',
                  'array_property_aggregation',
                  'inline_derived',
                  'parallel_semantic',
                  'nth_time_hack',
                  'day_time_prop',
                  'user_state',
                  'server_upload_delay',
                  'catalog_event',
                  'catalog_user',
                  'user_property_value',
                  'persistence',
                  'field',
                  'table_column'
                ])
                .describe(
                  'FilterPropTypes — property source. Same enum as groupBy.type, filter subprop_type, and segment prop_type.'
                )
            })
            .strict()
        )
        .describe('analyze: optional metric filters.')
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  get_flags: z
    .object({
      flagIds: z.array(z.string()).min(1).describe('get: flag IDs or keys to retrieve.'),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  get_deployments: z
    .object({
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  search: z
    .object({
      appIds: z
        .array(z.string().min(1))
        .describe(
          'Array of app/project IDs to search within. If not provided, search will be for all apps the user has access to.'
        )
        .optional(),
      queries: z
        .array(z.string())
        .describe(
          'Array of search query strings. If not provided or empty, search will return results based on relevance to the user. Multiple queries are executed in parallel and results are deduplicated using Reciprocal Rank Fusion (RRF).'
        )
        .optional(),
      entityTypes: z
        .array(
          z.enum([
            'EVENT',
            'EVENT_PROPERTY',
            'USER_PROPERTY',
            'GROUP_PROPERTY',
            'DERIVED_PROPERTY',
            'LOOKUP_PROPERTY',
            'PERSISTED_PROPERTY',
            'CUSTOM_EVENT',
            'SAVED_SEGMENT',
            'METRIC',
            'CHART',
            'DASHBOARD',
            'NOTEBOOK',
            'COHORT',
            'SPACE',
            'FLAG',
            'EXPERIMENT',
            'GUIDE',
            'SURVEY',
            'AMPLITUDE_DOCS'
          ])
        )
        .describe(
          "Types of entities to search for. Will be converted to camelCase internally for entityRef field access. 'AMPLITUDE_DOCS' is special: it searches Amplitude's public product documentation (via the docs search endpoint) instead of your org's content, and can be combined with org entity types in a single call."
        )
        .optional(),
      includeArchived: z.boolean().describe('Whether to include archived entities').optional(),
      includeGenerated: z
        .boolean()
        .describe('Whether to include AI-generated entites')
        .optional(),
      owners: z.array(z.string()).describe('Filter by owners (array of login IDs)').optional(),
      excludeOwners: z
        .array(z.string())
        .describe('Filter out content by specific owners (array of login IDs)')
        .optional(),
      sortOrder: z
        .enum(['relevance', 'lastModified', 'viewCount', 'name'])
        .describe('Sort order for results')
        .optional(),
      isOfficial: z.boolean().describe('Filter by official content only').optional(),
      limitPerQuery: z
        .number()
        .describe(
          'Maximum number of results to return per query. Results from multiple queries are deduplicated before being returned. We recommend starting with the default of 50, even if you are using multiple queries.'
        )
        .optional(),
      sortDirection: z.enum(['ASC', 'DESC']).describe('Sort direction for results').optional(),
      lastModifiedAfter: z
        .number()
        .describe(
          'Filter to entities modified after this epoch timestamp (in seconds). Useful for finding recently active content, e.g. charts modified in the last 7 days.'
        )
        .optional(),
      lastViewedBefore: z
        .number()
        .describe(
          'Filter to entities last viewed before this epoch timestamp (in seconds). Useful for finding stale or unused content.'
        )
        .optional(),
      semanticSearch: z
        .boolean()
        .describe('Whether to use semantic search in addition to keyword search')
        .optional(),
      search_goal: z
        .string()
        .describe(
          'What you are looking for and what you plan to do with the results. Example: "Find the main retention dashboard to answer a question about churn."'
        )
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  manage_amp_events: z
    .object({
      action: z
        .literal('get')
        .describe('Read event definitions. Mutations are not supported.')
        .optional(),
      kind: z
        .enum(['event', 'custom', 'labeled', 'all'])
        .describe(
          'event = raw tracking-plan events (default). custom / labeled / all = custom-or-labeled surface (all only with get).'
        )
        .optional(),
      projectId: z
        .string()
        .describe(
          'Numeric Amplitude project ID (e.g. "123456"). Optional only when the user has exactly one accessible project. Call get_amplitude_context to discover accessible project IDs.'
        )
        .optional(),
      eventTypes: z
        .array(z.string())
        .describe(
          'get kind=event: exact ingested event names to hydrate. Prefer this over limit/cursor.'
        )
        .optional(),
      includeDeleted: z
        .boolean()
        .describe(
          'get kind=event: when true, include events with status "deleted". Defaults to false. Use this to find soft-deleted events before calling restore.'
        )
        .optional(),
      fields: z
        .array(
          z.enum([
            'name',
            'displayName',
            'description',
            'category',
            'tags',
            'status',
            'isActiveAction',
            'isOfficial',
            'isAmplitudeEvent',
            'hiddenFrom',
            'sources',
            'mergedFrom',
            'owner',
            'createdAt',
            'updatedAt',
            'updatedBy',
            'firstSeen',
            'lastSeen'
          ])
        )
        .min(1)
        .describe(
          'get kind=event: select event row fields. Valid requested fields: name, displayName, description, category, tags, status, isActiveAction, isOfficial, isAmplitudeEvent, hiddenFrom, sources, mergedFrom, owner, createdAt, updatedAt, updatedBy, firstSeen, lastSeen. Automatically returned: name (plus mergedFrom when the event is a merge target). Omit fields to return the current default fields: name, displayName, description, status. Required fields are automatic, and [] is invalid.'
        )
        .optional(),
      customEventIds: z
        .array(z.string())
        .describe('get kind=custom|labeled|all: filter by custom/labeled event ids.')
        .optional(),
      customEventNames: z
        .array(z.string())
        .describe(
          'get kind=custom|labeled|all: filter by exact display names (include punctuation/brackets as shown in UI).'
        )
        .optional(),
      limit: z
        .number()
        .min(1)
        .max(500)
        .describe(
          'get: page size (1-500) for rare exhaustive listing only. Prefer search + exact name filters.'
        )
        .optional(),
      cursor: z
        .string()
        .describe('get: pagination cursor for rare exhaustive listing only.')
        .optional(),
      branchId: z
        .string()
        .describe('get kind=event: optional branch id (mutually exclusive with branchName).')
        .optional(),
      branchName: z
        .string()
        .describe('get kind=event: optional branch name (mutually exclusive with branchId).')
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict(),
  get_properties: z
    .object({
      projectId: z
        .string()
        .describe(
          'Numeric Amplitude project ID. Optional only when the user has exactly one accessible project. Call get_amplitude_context to discover accessible project IDs.'
        )
        .optional(),
      propertyType: z
        .enum(['event', 'user', 'group', 'derived', 'lookup', 'channel', 'persisted'])
        .describe('properties: which property surface to read. Defaults to "event".')
        .optional(),
      eventType: z
        .string()
        .describe(
          'properties + propertyType=event: scope to one event; omit to list project-wide.'
        )
        .optional(),
      name: z
        .string()
        .describe('properties + propertyType=user: exact user property name.')
        .optional(),
      sources: z
        .array(z.enum(['AMPLITUDE', 'CUSTOMER']))
        .describe('properties + propertyType=user: filter by property source.')
        .optional(),
      groupTypes: z
        .array(z.string())
        .describe('properties + propertyType=group: filter to these group types.')
        .optional(),
      derivedPropertyType: z
        .enum(['event', 'user'])
        .describe('properties + propertyType=derived: narrow to one level.')
        .optional(),
      names: z
        .array(z.string())
        .describe('properties + propertyType=derived|channel|persisted: exact names.')
        .optional(),
      configurationFilter: z
        .enum(['all', 'configured', 'unconfigured'])
        .describe('properties + propertyType=lookup: configuration status.')
        .optional(),
      lookupTableName: z
        .string()
        .describe('properties + propertyType=lookup: filter to one lookup table.')
        .optional(),
      fields: z
        .array(
          z.enum([
            'name',
            'displayName',
            'description',
            'category',
            'tags',
            'status',
            'isActiveAction',
            'isOfficial',
            'isAmplitudeEvent',
            'hiddenFrom',
            'sources',
            'mergedFrom',
            'owner',
            'createdAt',
            'updatedAt',
            'updatedBy',
            'firstSeen',
            'lastSeen',
            'eventType',
            'type',
            'isRequired',
            'isHidden',
            'isDeleted',
            'isBlocked',
            'enumValues',
            'regex',
            'isArrayType',
            'classifications',
            'isInSchema',
            'attachedToOtherEvents',
            'source',
            'groupTypes',
            'origin',
            'formula',
            'propertyType',
            'chartPropType',
            'isCommitted',
            'isOOTB',
            'groupType',
            'id',
            'lookupTableName',
            'columnHeader',
            'keyColumnHeader',
            'keyProperty',
            'rowCount',
            'lastModifiedAt',
            'definition'
          ])
        )
        .min(1)
        .describe(
          'Select response row fields. Valid values depend on the action and propertyType; omit for that surface’s defaults.'
        )
        .optional(),
      limit: z
        .number()
        .min(1)
        .max(500)
        .describe('Page size. Prefer exact-name filters over exhaustive listing.')
        .optional(),
      cursor: z.string().describe('Pagination cursor.').optional(),
      includeDeleted: z.boolean().describe('Include deleted rows. Defaults false.').optional(),
      includeHidden: z
        .boolean()
        .describe('properties: include hidden rows. Defaults true.')
        .optional(),
      includeBlocked: z
        .boolean()
        .describe('properties: include blocked rows. Defaults true.')
        .optional(),
      includeTransformations: z
        .boolean()
        .describe(
          'properties + propertyType=event|user: include transformations. Defaults true.'
        )
        .optional(),
      branchId: z
        .string()
        .describe('Optional branch id (mutually exclusive with branchName).')
        .optional(),
      branchName: z
        .string()
        .describe('Optional branch name (mutually exclusive with branchId).')
        .optional(),
      rationale: z
        .string()
        .describe(
          'Brief explanation of why you are calling this tool and what you expect to learn from the result.'
        )
        .optional()
    })
    .strict()
};
