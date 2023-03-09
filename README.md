# GitHub Action: fermyon/setup-spin

The `fermyon/actions` is a collection of Github actions to enable running [spin](https://github.com/fermyon/spin) commands in your GitHub Actions workflow.

It enables the following usecases:

- setup spin and plugins (`fermyon/actions/spin/setup`)
- build and push to OCI registry (`fermyon/actions/spin/push`)
- deploy to Fermyon Cloud (`fermyon/actions/spin/deploy`)


## `fermyon/action/spin/setup`

setup `spin` with optional plugins

### Inputs

| Name         | Required | Description                                                                                                                                   | Default |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| version      | Optional | The version of `spin` to install. Supports [semver](https://www.npmjs.com/package/semver) versioning                                          | latest  |
| plugins      | Optional | The comma-separated list of `spin plugins` to install                                                                                         | -       |
| github_token | Optional | The `GitHub` token for querying/downloading `spin` releases. If provided, it avoids Github api rate limiting during Github actions executions | -       |

### Examples

#### Setting up latest version of `spin` 

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
        uses: fermyon/actions/spin/setup@v1

      - name: Run `spin version`
        run: "spin --version"
```

#### Setting up a specific version of `spin` 

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
        uses: fermyon/actions/spin/setup@v1
        with:
          version: "v0.10.1"

      - name: Run `spin version`
        run: "spin --version"
```

#### Setting up `spin` and additionally installing spin plugins

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
        uses: fermyon/actions/spin/setup@v1
        with:
          version: "v0.10.1"
          plugins: js2wasm

      - name: Run `spin version`
        run: "spin --version"
```

## `fermyon/action/spin/push`

Build and push the `spin` app to Registry

### Inputs

| Name               | Required | Description                                                                | Default   |
| ------------------ | -------- | -------------------------------------------------------------------------- | --------- |
| registry_reference | Required | Push the spin app to OCI Registry. e.g. ghcr.io/fermyon/cloud-start:v0.0.1 | -         |
| manifest_file      | Optional | Path to `spin.toml`                                                        | spin.toml |
| registry           | Optional | if provided, used to login to OCI Registry                                 | -         |
| registry_username  | Optional | if provided, used to login to OCI Registry                                 | -         |
| registry_password  | Optional | if provided, used to login to OCI Registry                                 | -         |

### Example

```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Build and push
    steps:
      - uses: actions/checkout@v3

      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1
        with:
          version: "v0.10.1"
          plugins: js2wasm

      - name: Login to the Container registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: build and push
        uses: fermyon/actions/spin/push@v1
        with:
          manifest_file: example-app/spin.toml
          registry_reference: ghcr.io/fermyon/example-app:v0.0.1

```




## `fermyon/action/spin/deploy`

Build and deploy the `spin` app to Fermyon Cloud

### Inputs

| Name          | Required | Description                                                                       | Default   |
| ------------- | -------- | --------------------------------------------------------------------------------- | --------- |
| fermyon_token | Required | Fermyon Cloud Personal access token for deploying the `spin` app to Fermyon Cloud | -         |
| manifest_file | Optional | Path to `spin.toml`. Used with the `build`/`deploy` command.                      | spin.toml |

### Example


```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Build and deploy
    steps:
      - uses: actions/checkout@v3

      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1
        with:
          version: canary
          plugins: js2wasm

      - name: build and deploy
        uses: fermyon/actions/spin/deploy@v1
        with:
          manifest_file: example-app/spin.toml
          fermyon_token: ${{ secrets.FERMYON_CLOUD_TOKEN }}
```
