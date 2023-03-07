# GitHub Action: fermyon/setup-spin

The `fermyon/setup-spin` action sets up the `spin` CLI in your GitHub Actions workflow by adding the binary to `PATH`. Additionally it can also perform following:

- build spin app
- push to oci registry
- deploy to Fermyon Cloud

## Setting up `spin` 

1.) Create a GitHub Actions Workflow file (e.g.: `.github/workflows/spin.yml`):

```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Setup spin
    steps:
      - name: Setup `spin`
        uses: fermyon/setup-spin@v0.0.1
        with:
          version: "v0.10.0"

      - name: Run `spin version`
        run: "spin --version"
```

### Inputs

This section contains a list of all inputs that may be set for this Action.


| Name          |   Required    | Description   | Default       |
| ------------- | ------------- | ------------- | ------------- |
| version       | Optional      | The version of `spin` to install. Supports [semver](https://www.npmjs.com/package/semver) versioning | v0.8.0 |
| plugins       | Optional      | The comma separated list of `spin plugins` to install | - |
| app_config_file       | Optional      | Path to `spin.toml` file  | - |
| cloud_base_url       | Optional      | cloud base url to use for deploying apps  | [Fermyon Cloud](https://cloud.fermyon.com) |
| oci_app_reference       | Optional      | if provided, it is used for pushing spin app to oci registry. e.g. ghcr.io/rajatjindal/cloud-start:v0.0.1  | - |
| deploy       | Optional      | deploys the app to Fermyon cloud  | false |

# setup-spin
