import type { AWSAuth, EventTarget } from './models';

export const eventTargetSecrets = (target: EventTarget) => [
  ...[target.kinesis?.auth, target.firehose?.auth, target.cloudwatch_logs?.auth].flatMap(
    auth => [auth?.creds?.aws_access_key_id, auth?.creds?.aws_secret_access_key]
  ),
  target.datadog?.api_key,
  target.azure_logs_ingestion?.client_secret
];

const publicAwsAuth = (auth: AWSAuth | null | undefined) =>
  auth
    ? {
        ...auth,
        ...(auth.creds
          ? { creds: { aws_access_key_id: '[redacted]', aws_secret_access_key: '[redacted]' } }
          : {})
      }
    : auth;

export const publicEventTarget = (target: EventTarget | null | undefined) =>
  target
    ? {
        ...target,
        ...(target.kinesis
          ? { kinesis: { ...target.kinesis, auth: publicAwsAuth(target.kinesis.auth) } }
          : {}),
        ...(target.firehose
          ? { firehose: { ...target.firehose, auth: publicAwsAuth(target.firehose.auth) } }
          : {}),
        ...(target.cloudwatch_logs
          ? {
              cloudwatch_logs: {
                ...target.cloudwatch_logs,
                auth: publicAwsAuth(target.cloudwatch_logs.auth)
              }
            }
          : {}),
        ...(target.datadog ? { datadog: { ...target.datadog, api_key: '[redacted]' } } : {}),
        ...(target.azure_logs_ingestion
          ? {
              azure_logs_ingestion: {
                ...target.azure_logs_ingestion,
                client_secret: '[redacted]'
              }
            }
          : {})
      }
    : null;
