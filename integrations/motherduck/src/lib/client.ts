import { Client, type FieldDef, type QueryResultRow } from 'pg';
import { buildApiServiceError } from 'slates';

export const MOTHERDUCK_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'ap-northeast-1',
  'ap-southeast-2'
] as const;

export type MotherDuckRegion = (typeof MOTHERDUCK_REGIONS)[number];

export type MotherDuckQueryResult<Row extends QueryResultRow = QueryResultRow> = {
  rows: Row[];
  fields: FieldDef[];
  rowCount: number | null;
};

export type MotherDuckQueryExecutor = (
  database: string,
  sql: string,
  values: unknown[]
) => Promise<MotherDuckQueryResult>;

export const motherDuckPostgresHost = (region: MotherDuckRegion) =>
  `pg.${region}-aws.motherduck.com`;

export class MotherDuckClient {
  constructor(
    private readonly token: string,
    private readonly region: MotherDuckRegion,
    private readonly executor?: MotherDuckQueryExecutor
  ) {}

  async query<Row extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
    database = 'md:'
  ): Promise<MotherDuckQueryResult<Row>> {
    try {
      if (this.executor)
        return (await this.executor(database, sql, values)) as MotherDuckQueryResult<Row>;

      let client = new Client({
        host: motherDuckPostgresHost(this.region),
        port: 5432,
        user: 'postgres',
        password: this.token,
        database,
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 15_000,
        query_timeout: 55_000
      });

      await client.connect();
      try {
        let result = await client.query<Row>(sql, values);
        return { rows: result.rows, fields: result.fields, rowCount: result.rowCount };
      } finally {
        await client.end();
      }
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'MotherDuck',
        operation: 'execute SQL through the PostgreSQL endpoint',
        reason: 'motherduck_sql_error'
      });
    }
  }

  async getProfile() {
    let result = await this.query<{
      user_id: string;
      username: string;
      org_id: string;
      org_name: string;
      region: string;
    }>('SELECT * FROM MD_USER_INFO()');
    let user = result.rows[0];
    return {
      id: user?.user_id ?? user?.org_id ?? 'motherduck-user',
      name: user?.username
        ? `${user.username}${user.org_name ? ` (${user.org_name})` : ''}`
        : 'MotherDuck workspace'
    };
  }
}

export let createMotherDuckClient = (
  token: string,
  region: MotherDuckRegion,
  executor?: MotherDuckQueryExecutor
) => new MotherDuckClient(token, region, executor);
