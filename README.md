# 📦 Local Explorer for Discord Packages

What's **really** in your Discord Data package? And how can this data be useful? This app does the job for you!

This is a fork of [Discord Data Package Explorer](https://github.com/Androz2091/discord-data-package-explorer) by Androz2091, updated to run locally. Not affiliated with, endorsed by, or sponsored by Discord Inc.

> [!IMPORTANT]
> This version has been updated to work with the Discord data package format as of 2026.

## How to Use

* Ask for your data file in Discord (`Settings` > `Privacy & Safety`)
* Clone this repository
* Run `./setup.sh` to check for (and install) the dependencies you need - Node.js and Yarn
* Run `./start.sh` to build and start the app. It'll print the URL to open (defaults to `http://localhost:5000` - use `./start.sh --port <port>` to pick a different one)
* Import your data file!

### Docker

This repository provides a Docker image and compose file. Simply run `docker-compose up -d` in the project directory 
and you can access the app at http://localhost:5000.

### Manual Installation

This app is built with **[Svelte](https://svelte.dev)**, and is quite easy to install.

* Clone the repository.
* Install the dependencies using `npm install` or `yarn install`.
* Start the app using `npm run dev` or `yarn dev`!

> Note: for testing purposes, you can use the `/stats/demo` route to see mocked data.
