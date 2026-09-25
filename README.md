# IRONCLASH // Tank Arena

IRONCLASH is a browser-based tank game with 1v1, 2v2, 4v4, and 1v1v1 free-for-all modes.

## Online multiplayer

Select **ONLINE ROOM**, choose the same mode and arena, then click **CREATE ROOM**. Send the displayed room code to your friend. They open the same GitHub Pages URL, select **ONLINE ROOM**, enter the code, and click **JOIN ROOM**.

The host browser runs the match simulation and synchronizes the live state to connected players. PeerJS provides signaling, while gameplay data travels through browser WebRTC connections. Both players should use the same deployed `https://` URL.

## LAN multiplayer

For a same-Wi-Fi match, download the project, install Node.js, then run `npm install` followed by `npm start` on one computer. Open the printed `http://<LAN-IP>:8787` URL on every computer, select **ONLINE ROOM → LAN**, and use the six-digit room code. The included `lan-server.js` relays the game data only across your local network.

## Local modes

- **VS BOTS** lets the computer fill every open slot.
- **LOCAL PARTY** puts every tank on the keyboard under a different control set.

## Publish on GitHub Pages

1. Upload `index.html`, `styles.css`, `game.js`, and `README.md` to a GitHub repository.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, select the default branch and `/ (root)`, then save.

No build command or package installation is needed.

## Controls

- Player 1: `W A S D` to move, `Space` to fire
- Player 2: Arrow keys to move, `Enter` to fire
- Player 3: `I J K L` to move, `U` to fire
- Player 4: `T F G H` to move, `Y` to fire
- Warfront adds compact keyboard layouts shown in the arena HUD
- Online players use `W A S D` to move, aim with the mouse, and hold left-click to fire. Both computers can use the same controls.
- Green repair cells appear every 20 seconds and restore health when collected.

Press `Esc` during a match to return to the lobby.
