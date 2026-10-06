# E2B

Create, inspect, list, pause, resume, and terminate secure Linux cloud sandboxes. Set sandbox timeouts, pass environment variables and metadata, mount persistent volumes, create and list reusable snapshots, discover and delete templates, read lifecycle events, and manage webhook subscriptions.

Authenticate with an API key from the [E2B dashboard](https://e2b.dev/dashboard). Operations target the project associated with that key. `create_sandbox` uses the `base` template when no template is supplied. Use `list_templates` to discover custom templates, or pass the `snapshotId` returned by `create_snapshot` to create a sandbox from a saved state.

Webhook management supports created, updated, killed, paused, resumed, and checkpointed lifecycle events. Supply your own `signatureSecret` when creating a webhook if your receiver needs to verify deliveries. Automatically generated secrets are not returned. See the [webhook reference](https://e2b.dev/docs/sandbox/lifecycle-events-webhooks) for the signature protocol.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
