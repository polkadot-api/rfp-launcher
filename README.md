# RFP Launcher

A dApp for creating and submitting Requests for Proposals (RFPs) on Kusama or Polkadot.

## Features

- Create and submit an RFP using structured inputs.
- Integrates with popular Substrate wallets (Nova, Talisman, Subwallet).
- Validates that the selected account has sufficient balance.
- Generates markdown-ready content for the referendum body.
- Supports Chopsticks integration for local fork testing.

## Development

### Installation

This is a pnpm + Vite + React + Polkadot API project. To install dependencies, run:

```sh
pnpm i
```

### Development server

During development, run the standard command. By default, it connects to Kusama:

```sh
pnpm dev
```

### Running with Chopsticks

To test against a local fork, first start a Chopsticks process in a separate terminal:

```sh
cd chopsticks
pnpm i
pnpm start
```

Then start the project in dev mode with `dev-local`:

```sh
pnpm dev-local
```

This configures the project to target the local Chopsticks process and enables additional features such as approving referenda, skipping to the next treasury spend period, or minting balances to test accounts.

### Deployment

The project currently is hosted on github pages through a github action.

If you want to preview changes in a fork, configure the `BASE_URL` environment variable in your github environment config. For example, something deployed in github pages `https://{something}.githubpages.io/rfp-launcher/` needs a `BASE_URL` environment variable with the value `/rfp-launcher/`

## Theming

This project uses the standard setup from [shadcn/ui](https://ui.shadcn.com) for theming, which uses TailwindCSS.

For basic theming changes, the variables can be set up in src/index.css. For more advanced usages, refer to [shadcn/ui docs](https://ui.shadcn.com/docs).

## Project Structure

The project follows a co-location principle. Components are grouped by functionality, and most of the state related to a component is kept close to it, with the exception of some shared utilities.

```
src/
├── components/
│   ├── ChopsticksController     # Modal to manipulate chain state
│   ├── RfpForm                  # Main form and its components, separated by section
│   │   └── data                 # Common functions to show and validate form data
│   ├── SelectAccount            # Modal for wallet integration and account selection
│   ├── SubmitModal              # Modal to submit and launch the RFP
│   │   └── tx                   # Functions to create and track transactions
│   └── ui                       # Stateless UI components from shadcn/ui
├── lib/                         # Utility functions that could live in separate libraries
├── chain.ts                     # Connection to the blockchain
└── constants.ts                 # Various constants used across the project
```

## License

MIT — Feel free to use and adapt.
