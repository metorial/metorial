import { z } from 'zod';

// Response fields follow ngrok's published API v2 OpenAPI specification.

export const apiKeySchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  created_at: z.string().nullish(),
  token: z.string().nullish(),
  owner_id: z.string().nullish()
});
export type APIKey = z.infer<typeof apiKeySchema>;

export const apiKeyListSchema = z.object({
  keys: z.array(apiKeySchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type APIKeyList = z.infer<typeof apiKeyListSchema>;

export const awsRoleSchema = z.object({
  role_arn: z.string()
});
export type AWSRole = z.infer<typeof awsRoleSchema>;

export const awsCredentialsSchema = z.object({
  aws_access_key_id: z.string().nullish(),
  aws_secret_access_key: z.string().nullish()
});
export type AWSCredentials = z.infer<typeof awsCredentialsSchema>;

export const awsAuthSchema = z.object({
  role: awsRoleSchema.nullish(),
  creds: awsCredentialsSchema.nullish()
});
export type AWSAuth = z.infer<typeof awsAuthSchema>;

export const botUserSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  name: z.string().nullish(),
  active: z.boolean(),
  created_at: z.string().nullish()
});
export type BotUser = z.infer<typeof botUserSchema>;

export const serviceUserListSchema = z.object({
  service_users: z.array(botUserSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type ServiceUserList = z.infer<typeof serviceUserListSchema>;

export const certificateAuthoritySchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  ca_pem: z.string().nullish(),
  subject_common_name: z.string().nullish(),
  not_before: z.string().nullish(),
  not_after: z.string().nullish(),
  key_usages: z.array(z.string()).nullish(),
  extended_key_usages: z.array(z.string()).nullish()
});
export type CertificateAuthority = z.infer<typeof certificateAuthoritySchema>;

export const certificateAuthorityListSchema = z.object({
  certificate_authorities: z.array(certificateAuthoritySchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type CertificateAuthorityList = z.infer<typeof certificateAuthorityListSchema>;

export const credentialSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  token: z.string().nullish(),
  acl: z.array(z.string()).nullish(),
  owner_id: z.string().nullish()
});
export type Credential = z.infer<typeof credentialSchema>;

export const credentialListSchema = z.object({
  credentials: z.array(credentialSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type CredentialList = z.infer<typeof credentialListSchema>;

export const refSchema = z.object({
  id: z.string(),
  uri: z.string()
});
export type Ref = z.infer<typeof refSchema>;

export const endpointSchema = z.object({
  id: z.string(),
  region: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  public_url: z.string().nullish(),
  proto: z.string().nullish(),
  scheme: z.string().nullish(),
  hostport: z.string().nullish(),
  host: z.string().nullish(),
  port: z.number().nullish(),
  type: z.string().nullish(),
  metadata: z.string().nullish(),
  description: z.string().nullish(),
  domain: refSchema.nullish(),
  tcp_addr: refSchema.nullish(),
  tunnel: refSchema.nullish(),
  edge: refSchema.nullish(),
  upstream_url: z.string().nullish(),
  upstream_protocol: z.string().nullish(),
  url: z.string().nullish(),
  principal: refSchema.nullish(),
  traffic_policy: z.string().nullish(),
  bindings: z.array(z.string()).nullish(),
  tunnel_session: refSchema.nullish(),
  uri: z.string().nullish(),
  name: z.string().nullish(),
  pooling_enabled: z.boolean().nullish()
});
export type Endpoint = z.infer<typeof endpointSchema>;

export const endpointListSchema = z.object({
  endpoints: z.array(endpointSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type EndpointList = z.infer<typeof endpointListSchema>;

export const eventTargetFirehoseSchema = z.object({
  auth: awsAuthSchema.nullish(),
  delivery_stream_arn: z.string().nullish()
});
export type EventTargetFirehose = z.infer<typeof eventTargetFirehoseSchema>;

export const eventTargetKinesisSchema = z.object({
  auth: awsAuthSchema.nullish(),
  stream_arn: z.string().nullish()
});
export type EventTargetKinesis = z.infer<typeof eventTargetKinesisSchema>;

export const eventTargetCloudwatchLogsSchema = z.object({
  auth: awsAuthSchema.nullish(),
  log_group_arn: z.string().nullish()
});
export type EventTargetCloudwatchLogs = z.infer<typeof eventTargetCloudwatchLogsSchema>;

export const eventTargetDatadogSchema = z.object({
  api_key: z.string().nullish(),
  ddtags: z.string().nullish(),
  service: z.string().nullish(),
  ddsite: z.string().nullish()
});
export type EventTargetDatadog = z.infer<typeof eventTargetDatadogSchema>;

export const eventTargetAzureLogsIngestionSchema = z.object({
  tenant_id: z.string(),
  client_id: z.string(),
  client_secret: z.string().nullish(),
  logs_ingestion_uri: z.string(),
  data_collection_rule_id: z.string(),
  data_collection_stream_name: z.string()
});
export type EventTargetAzureLogsIngestion = z.infer<
  typeof eventTargetAzureLogsIngestionSchema
>;

export const eventTargetSchema = z.object({
  firehose: eventTargetFirehoseSchema.nullish(),
  kinesis: eventTargetKinesisSchema.nullish(),
  cloudwatch_logs: eventTargetCloudwatchLogsSchema.nullish(),
  datadog: eventTargetDatadogSchema.nullish(),
  azure_logs_ingestion: eventTargetAzureLogsIngestionSchema.nullish()
});
export type EventTarget = z.infer<typeof eventTargetSchema>;

export const eventDestinationSchema = z.object({
  id: z.string(),
  metadata: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  format: z.string().nullish(),
  target: eventTargetSchema.nullish(),
  uri: z.string().nullish()
});
export type EventDestination = z.infer<typeof eventDestinationSchema>;

export const eventDestinationListSchema = z.object({
  event_destinations: z.array(eventDestinationSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type EventDestinationList = z.infer<typeof eventDestinationListSchema>;

export const eventSourceSchema = z.object({
  type: z.string(),
  uri: z.string().nullish()
});
export type EventSource = z.infer<typeof eventSourceSchema>;

export const eventSubscriptionSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  metadata: z.string().nullish(),
  description: z.string().nullish(),
  sources: z.array(eventSourceSchema).nullish(),
  destinations: z.array(refSchema).nullish()
});
export type EventSubscription = z.infer<typeof eventSubscriptionSchema>;

export const eventSubscriptionListSchema = z.object({
  event_subscriptions: z.array(eventSubscriptionSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type EventSubscriptionList = z.infer<typeof eventSubscriptionListSchema>;

export const ipPolicySchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish()
});
export type IPPolicy = z.infer<typeof ipPolicySchema>;

export const ipPolicyListSchema = z.object({
  ip_policies: z.array(ipPolicySchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type IPPolicyList = z.infer<typeof ipPolicyListSchema>;

export const ipPolicyRuleSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  cidr: z.string().nullish(),
  ip_policy: refSchema.nullish(),
  action: z.string().nullish()
});
export type IPPolicyRule = z.infer<typeof ipPolicyRuleSchema>;

export const ipPolicyRuleListSchema = z.object({
  ip_policy_rules: z.array(ipPolicyRuleSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type IPPolicyRuleList = z.infer<typeof ipPolicyRuleListSchema>;

export const reservedAddrSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  addr: z.string().nullish(),
  region: z.string().nullish()
});
export type ReservedAddr = z.infer<typeof reservedAddrSchema>;

export const reservedAddrListSchema = z.object({
  reserved_addrs: z.array(reservedAddrSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type ReservedAddrList = z.infer<typeof reservedAddrListSchema>;

export const reservedDomainCertPolicySchema = z.object({
  authority: z.string().nullish(),
  private_key_type: z.string().nullish()
});
export type ReservedDomainCertPolicy = z.infer<typeof reservedDomainCertPolicySchema>;

export const reservedDomainCertJobSchema = z.object({
  error_code: z.string().nullish(),
  msg: z.string().nullish(),
  started_at: z.string().nullish(),
  retries_at: z.string().nullish()
});
export type ReservedDomainCertJob = z.infer<typeof reservedDomainCertJobSchema>;

export const reservedDomainCertStatusSchema = z.object({
  renews_at: z.string().nullish(),
  provisioning_job: reservedDomainCertJobSchema.nullish()
});
export type ReservedDomainCertStatus = z.infer<typeof reservedDomainCertStatusSchema>;

export const reservedDomainResolvesToEntrySchema = z.object({
  value: z.string().nullish()
});
export type ReservedDomainResolvesToEntry = z.infer<
  typeof reservedDomainResolvesToEntrySchema
>;

export const reservedDomainSchema = z.object({
  id: z.string(),
  uri: z.string(),
  created_at: z.string(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  domain: z.string(),
  region: z.string().nullish(),
  cname_target: z.string().nullish(),
  certificate: refSchema.nullish(),
  certificate_management_policy: reservedDomainCertPolicySchema.nullish(),
  certificate_management_status: reservedDomainCertStatusSchema.nullish(),
  acme_challenge_cname_target: z.string().nullish(),
  resolves_to: z.array(reservedDomainResolvesToEntrySchema)
});
export type ReservedDomain = z.infer<typeof reservedDomainSchema>;

export const reservedDomainListSchema = z.object({
  reserved_domains: z.array(reservedDomainSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type ReservedDomainList = z.infer<typeof reservedDomainListSchema>;

export const sshCertificateAuthoritySchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  public_key: z.string().nullish(),
  key_type: z.string().nullish()
});
export type SSHCertificateAuthority = z.infer<typeof sshCertificateAuthoritySchema>;

export const sshCertificateAuthorityListSchema = z.object({
  ssh_certificate_authorities: z.array(sshCertificateAuthoritySchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type SSHCertificateAuthorityList = z.infer<typeof sshCertificateAuthorityListSchema>;

export const sshCredentialSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  public_key: z.string().nullish(),
  acl: z.array(z.string()).nullish(),
  owner_id: z.string().nullish()
});
export type SSHCredential = z.infer<typeof sshCredentialSchema>;

export const sshCredentialListSchema = z.object({
  ssh_credentials: z.array(sshCredentialSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type SSHCredentialList = z.infer<typeof sshCredentialListSchema>;

export const secretSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  created_by: refSchema.nullish(),
  last_updated_by: refSchema.nullish(),
  vault: refSchema.nullish(),
  vault_name: z.string().nullish()
});
export type Secret = z.infer<typeof secretSchema>;

export const secretListSchema = z.object({
  secrets: z.array(secretSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type SecretList = z.infer<typeof secretListSchema>;

export const tlsCertificateSANsSchema = z.object({
  dns_names: z.array(z.string()).nullish(),
  ips: z.array(z.string()).nullish()
});
export type TLSCertificateSANs = z.infer<typeof tlsCertificateSANsSchema>;

export const tlsCertificateSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  certificate_pem: z.string().nullish(),
  subject_common_name: z.string().nullish(),
  subject_alternative_names: tlsCertificateSANsSchema.nullish(),
  issued_at: z.string().nullish(),
  not_before: z.string().nullish(),
  not_after: z.string().nullish(),
  key_usages: z.array(z.string()).nullish(),
  extended_key_usages: z.array(z.string()).nullish().nullish(),
  private_key_type: z.string().nullish(),
  issuer_common_name: z.string().nullish(),
  serial_number: z.string().nullish(),
  subject_organization: z.string().nullish(),
  subject_organizational_unit: z.string().nullish(),
  subject_locality: z.string().nullish(),
  subject_province: z.string().nullish(),
  subject_country: z.string().nullish()
});
export type TLSCertificate = z.infer<typeof tlsCertificateSchema>;

export const tlsCertificateListSchema = z.object({
  tls_certificates: z.array(tlsCertificateSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type TLSCertificateList = z.infer<typeof tlsCertificateListSchema>;

export const tunnelSchema = z.object({
  id: z.string(),
  public_url: z.string().nullish(),
  started_at: z.string().nullish(),
  metadata: z.string().nullish(),
  proto: z.string().nullish(),
  region: z.string().nullish(),
  tunnel_session: refSchema.nullish(),
  endpoint: refSchema.nullish(),
  labels: z.record(z.string(), z.string()).nullish(),
  backends: z.array(refSchema).nullish(),
  forwards_to: z.string().nullish()
});
export type Tunnel = z.infer<typeof tunnelSchema>;

export const tunnelListSchema = z.object({
  tunnels: z.array(tunnelSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type TunnelList = z.infer<typeof tunnelListSchema>;

export const tunnelSessionSchema = z.object({
  agent_version: z.string().nullish(),
  credential: refSchema.nullish(),
  id: z.string(),
  ip: z.string().nullish(),
  metadata: z.string().nullish(),
  os: z.string().nullish(),
  region: z.string().nullish(),
  started_at: z.string().nullish(),
  transport: z.string().nullish(),
  uri: z.string().nullish()
});
export type TunnelSession = z.infer<typeof tunnelSessionSchema>;

export const tunnelSessionListSchema = z.object({
  tunnel_sessions: z.array(tunnelSessionSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type TunnelSessionList = z.infer<typeof tunnelSessionListSchema>;

export const vaultSchema = z.object({
  id: z.string(),
  uri: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.string().nullish(),
  created_by: z.string().nullish(),
  last_updated_by: z.string().nullish()
});
export type Vault = z.infer<typeof vaultSchema>;

export const vaultListSchema = z.object({
  vaults: z.array(vaultSchema),
  uri: z.string().nullish(),
  next_page_uri: z.string().nullish()
});
export type VaultList = z.infer<typeof vaultListSchema>;
