# plex-letterboxd
Syncs your letterboxd watchlist with movies on you plex

## Installation

1. `git clone https://github.com/slgoetz/plex-letterboxd-sync.git`
2. `cd plex-letterboxd-sync`
3. `yarn install`

## Usage
If you want this to run in the background and sync once a day you can add it as a launch script on your mac. To do so you will need to fill in the blanks (`{path-for-your-file}` and `{username}`) in `launched.plexletterboxdsync.plist`. Then check to see if you have a directory at `~/Library/LaunchAgents`. If not, create one and copy the launch file there. This should run at midnight every day and output a log file for synced movies as well as errors. 

*Make sure the `PATH` set the start.sh file is replaced with your `PATH`*

### Run Once
If you would like to run this once, you can run with `node ./index.js`

## Roadmap
- [ ] Sync ratings
- [ ] Sync Watched

