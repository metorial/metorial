# Scale AI

Create and manage annotation projects, tasks, and batches through the Scale v1 API. Discover projects and batches, submit annotation tasks, retrieve results, update task metadata and tags, manage deduplication identifiers, and inspect batch progress. Team management, file imports, and Rapid evaluation tasks are also available.

Connect with a Scale API key. Test and live modes use separate keys and resources; live task submission incurs labeling charges. Discover project names with `list_projects` and batch names with `list_batches`. Task lists use `nextToken`; batch lists expose `nextOffset` when more results are available.

The integration does not expose event triggers. Task and batch tools still accept provider callback URLs, and `resend_callback` can retry delivery to a task's existing receiver. See [Scale's callback reference](https://api-reference.scale.com/docs/api-reference/callbacks).

See [the capability reference](./docs/SPEC.md) for constraints and provider sources.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
