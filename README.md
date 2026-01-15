# MediaGrab Pro 🎬

A professional-grade, full-stack video downloader for YouTube, Instagram, Facebook, and WhatsApp. Download videos in up to 8K quality with audio, no watermarks!

![MediaGrab Pro](https://img.shields.io/badge/Version-1.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **Multi-Platform Support**: YouTube, Instagram, Facebook, WhatsApp
- **High Quality**: Up to 8K resolution with audio
- **No Watermarks**: Clean downloads without branding
- **Preview Before Download**: See thumbnails, duration, and file size
- **Quality Selection**: Choose from 360p to 8K
- **Fast Downloads**: Optimized for speed
- **Beautiful UI**: Modern glassmorphism design with animations
- **Responsive**: Works on desktop and mobile

## 🚀 Quick Start

### Frontend Only (Demo Mode)

Simply open `index.html` in your browser:

```bash
# Windows
start index.html

# Mac
open index.html

# Linux
xdg-open index.html
```

> Note: Demo mode simulates downloads. For real downloads, run the backend server.

### Full Stack (Real Downloads)

#### Prerequisites

1. **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
2. **yt-dlp** - Video download engine
3. **FFmpeg** - For merging audio/video

#### Installation

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Install yt-dlp (if not included)
pip install yt-dlp

# 3. Install FFmpeg
# Windows: Download from https://ffmpeg.org/download.html and add to PATH
# Mac: brew install ffmpeg
# Linux: sudo apt install ffmpeg
```

#### Running the Server

```bash
# Start the backend server
python server.py
```

The server will start on `http://localhost:5000`.

Now open `index.html` in your browser - it will automatically connect to the server.

## 📖 How to Use

1. **Choose Platform**: Click YouTube, Instagram, Facebook, or WhatsApp
2. **Select Content Type**: Videos, Shorts, Reels, Stories, etc.
3. **Paste URL**: Enter the video/post URL
4. **Select Quality**: Choose from 360p to 8K
5. **Click Fetch**: Preview the media
6. **Download**: Save to your device

## 📁 Project Structure

```
primal-curiosity/
├── index.html        # Main HTML file
├── styles.css        # CSS styles (glassmorphism design)
├── app.js           # Frontend JavaScript (UI logic)
├── api.js           # API integration for backend
├── server.py        # Python Flask backend
├── requirements.txt # Python dependencies
└── README.md        # This file
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/info` | POST | Get video information |
| `/api/download` | POST | Start a download |
| `/api/download/:id/status` | GET | Get download status |
| `/api/download/:id/file` | GET | Get downloaded file |
| `/api/stream` | POST | Stream download directly |

### Example API Usage

```javascript
// Fetch video info
const response = await fetch('http://localhost:5000/api/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube'
    })
});
const data = await response.json();
console.log(data);
```

## 🎨 Customization

### Changing Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --accent-primary: #6366f1;      /* Main accent color */
    --accent-secondary: #8b5cf6;    /* Secondary accent */
    --bg-primary: #0a0a0f;          /* Background color */
}
```

### Adding New Platforms

1. Add platform config in `app.js` under `platforms` object
2. Add corresponding API handler in `server.py`
3. Add platform styles in `styles.css`

## ⚠️ Legal Notice

This tool is for **personal use only**. Please respect:

- Copyright laws in your jurisdiction
- Platform Terms of Service
- Content creator rights

Only download content you have permission to access.

## 🛠️ Troubleshooting

### "yt-dlp not found"
```bash
pip install yt-dlp
```

### "ffmpeg not found"
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to system PATH.

### "Download failed" for Instagram
Instagram requires cookies for some content. Export cookies from your browser to `cookies.txt`.

### Server not connecting
- Ensure Python server is running on port 5000
- Check firewall settings
- Verify CORS is enabled

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

## 🙏 Credits

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Download engine
- [FFmpeg](https://ffmpeg.org/) - Media processing
- [Flask](https://flask.palletsprojects.com/) - Python web framework
- [Inter Font](https://fonts.google.com/specimen/Inter) - Typography

---

Made with ❤️ by MediaGrab Pro Team
