# IRONCLASH // Tank Arena

IRONCLASH is a browser-based local multiplayer tank game for a school project. It has three game modes:

- **Duel** — 1v1
- **Squad** — 2v2
- **Warfront** — 4v4

The game runs entirely in the browser with no backend. Choose **VS BOTS** to let the computer fill every open slot, or **LOCAL PARTY** to put every tank on the keyboard under a different control set.

## Run locally

Open `index.html` in a browser. For the smoothest local development experience, use any static file server from the project folder.

## Publish on GitHub Pages

1. Create a GitHub repository and upload `index.html`, `styles.css`, `game.js`, and `README.md`.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the default branch and `/ (root)`, then save.
4. GitHub will provide a public URL when the deployment finishes.

No build command, package installation, or server-side code is needed.

## Controls

- Player 1: `W A S D` to move, `Space` to fire
- Player 2: Arrow keys to move, `Enter` to fire
- Player 3: `I J K L` to move, `U` to fire
- Player 4: `T F G H` to move, `Y` to fire
- Warfront adds two more compact keyboard layouts shown in the arena HUD

Press `Esc` during a match to return to the lobby.
