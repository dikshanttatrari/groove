# 🎧 Groove

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-success?style=for-the-badge)

Groove is a premium, offline-first music streaming Progressive Web App (PWA). Built with a focus on performance and native-like user experience, it features a custom-built offline audio engine that bypasses standard browser caching to store complete audio binaries and cover art directly on the device.

## ✨ Features

- **True Offline Mode:** Download individual tracks or batch-download entire playlists. Audio files are stored as raw `Blob` data in `IndexedDB`, allowing thousands of songs to be saved locally without hitting standard `localStorage` limits.
- **PWA Ready:** Installable on iOS and Android straight from the browser. 
- **Service Worker Caching:** Custom `sw.js` intercepts network requests to serve cached album art and UI assets instantly when offline.
- **Spotify-Inspired UI:** Features dominant-color extraction for dynamic backgrounds, perfectly layered SVG download animations, and responsive safe-area insets for mobile notches (Dynamic Island).
- **Custom Event Syncing:** Utilizes a custom Publish/Subscribe architecture to sync download states across the Library, Player, and Playlist screens instantly without prop-drilling.
- **Smart Queueing:** Seamlessly transitions between network-fetched recommendations and predefined offline queues when the internet is disconnected.
- **Sleep Timer:** Built-in sleep timer with native-style modal selections.

## 🏗️ Architecture Highlight: The "App-Managed" Download
Instead of relying on the browser's public download manager (which clutters the user's phone gallery and files), Groove utilizes a "Silent Download" architecture:
1. Audio is fetched directly as a binary stream.
2. The binary `Blob` is written into a sandboxed `IndexedDB` instance.
3. Upon playback, `URL.createObjectURL()` generates a temporary local pointer to the browser's memory, completely decoupling the player from the network.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dikshanttatrari/groove.git
   cd groove
