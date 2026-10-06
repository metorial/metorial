# PhantomBuster

Manage individual Phantoms in an authorized workspace: discover, create, update, delete, queue a launch, stop execution and read execution history/output. Work with the beta LinkedIn Leads and dynamic lead-list APIs, and download accumulated CSV or JSON result files.

Use a workspace API key and a paid plan. An individual Phantom must be fully configured and have succeeded once from the dashboard before an API launch. Workflows/Flows are not supported by these endpoints. Launches may consume paid runtime and perform the external actions configured in the Phantom; inspect its configuration and obtain authorization first.

Creation accepts an exact script name with its owner and branch, or an existing script ID resolved through the script API. Public templates use owner `phantombuster` and branch `master`; custom scripts need their actual owner. Sensitive session and proxy credentials are omitted from configuration/output previews.

Result downloads use existing accumulated `result.csv` or `result.json`, or a configured custom filename. Launch-specific structured results remain available through Get Execution. The API does not provide individual result-file deletion; manage retained files from the dashboard.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
