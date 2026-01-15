"""
MediaGrab Pro - Backend Server
A Flask-based backend for downloading videos from YouTube, Instagram, Facebook, and WhatsApp.
Requires: pip install flask flask-cors yt-dlp requests
"""

from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import subprocess
import json
import os
import tempfile
import threading
import uuid
import time
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "mediagrab_downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Store download progress
downloads = {}

# ============ Utility Functions ============

def get_video_id_from_youtube_url(url):
    """Extract video ID from various YouTube URL formats"""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_instagram_shortcode(url):
    """Extract shortcode from Instagram URL"""
    patterns = [
        r'instagram\.com/p/([a-zA-Z0-9_-]+)',
        r'instagram\.com/reel/([a-zA-Z0-9_-]+)',
        r'instagram\.com/tv/([a-zA-Z0-9_-]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def sanitize_filename(filename):
    """Remove invalid characters from filename"""
    return re.sub(r'[<>:"/\\|?*]', '_', filename)[:200]

def format_duration(seconds):
    """Convert seconds to HH:MM:SS format"""
    if not seconds:
        return "00:00"
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"

def format_views(views):
    """Format view count"""
    if not views:
        return "N/A"
    if views >= 1_000_000:
        return f"{views/1_000_000:.1f}M"
    elif views >= 1_000:
        return f"{views/1_000:.1f}K"
    return str(views)

def format_filesize(bytes_size):
    """Format file size"""
    if not bytes_size:
        return "Unknown"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024
    return f"{bytes_size:.1f} TB"

# ============ YT-DLP Integration ============

def get_ytdlp_path():
    """Get yt-dlp executable path"""
    # Try common locations
    paths = ['yt-dlp', 'yt-dlp.exe', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp']
    for path in paths:
        try:
            result = subprocess.run([path, '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                return path
        except FileNotFoundError:
            continue
    return None

def fetch_video_info(url, platform='youtube'):
    """Fetch video information using yt-dlp"""
    ytdlp = get_ytdlp_path()
    if not ytdlp:
        raise Exception("yt-dlp not found. Please install it: pip install yt-dlp")
    
    cmd = [
        ytdlp,
        '--dump-json',
        '--no-download',
        '--no-warnings',
        url
    ]
    
    # Add cookies for Instagram if available
    cookies_file = Path(__file__).parent / 'cookies.txt'
    if cookies_file.exists():
        cmd.extend(['--cookies', str(cookies_file)])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            error_msg = result.stderr or "Failed to fetch video info"
            if "Private video" in error_msg or "private" in error_msg.lower():
                raise Exception("This content is private or unavailable.")
            raise Exception(error_msg)
        
        info = json.loads(result.stdout)
        return parse_video_info(info)
    except subprocess.TimeoutExpired:
        raise Exception("Request timed out. Please try again.")
    except json.JSONDecodeError:
        raise Exception("Invalid response from server.")

def parse_video_info(info):
    """Parse yt-dlp output to our format"""
    # Get available formats
    formats = info.get('formats', [])
    available_qualities = set()
    
    for fmt in formats:
        height = fmt.get('height')
        if height:
            available_qualities.add(str(height))
    
    # Sort qualities
    quality_order = ['4320', '2160', '1440', '1080', '720', '480', '360', '240', '144']
    sorted_qualities = [q for q in quality_order if q in available_qualities]
    
    if not sorted_qualities:
        sorted_qualities = ['best']
    
    # Get best quality available
    max_quality = sorted_qualities[0] if sorted_qualities else 'best'
    
    # Estimate file size based on duration and quality
    duration = info.get('duration', 0)
    bitrate_map = {
        '4320': 100_000,  # 100 Mbps for 8K
        '2160': 45_000,   # 45 Mbps for 4K
        '1440': 16_000,   # 16 Mbps for 2K
        '1080': 8_000,    # 8 Mbps for 1080p
        '720': 5_000,     # 5 Mbps for 720p
        '480': 2_500,     # 2.5 Mbps for 480p
        '360': 1_000      # 1 Mbps for 360p
    }
    
    estimated_bitrate = bitrate_map.get(max_quality, 5_000)
    estimated_size = (duration * estimated_bitrate * 1000) / 8  # Convert to bytes
    
    return {
        'id': info.get('id', 'unknown'),
        'title': info.get('title', 'Untitled'),
        'description': info.get('description', '')[:500],
        'duration': format_duration(info.get('duration')),
        'durationSeconds': info.get('duration', 0),
        'views': format_views(info.get('view_count')),
        'viewCount': info.get('view_count', 0),
        'thumbnail': info.get('thumbnail', ''),
        'uploader': info.get('uploader', 'Unknown'),
        'uploadDate': info.get('upload_date', ''),
        'availableQualities': sorted_qualities,
        'maxQuality': max_quality,
        'estimatedSize': format_filesize(estimated_size),
        'estimatedSizeBytes': int(estimated_size),
        'platform': info.get('extractor', 'unknown'),
        'url': info.get('webpage_url', ''),
        'isLive': info.get('is_live', False)
    }

def download_video(url, quality='best', include_audio=True, download_id=None):
    """Download video using yt-dlp"""
    ytdlp = get_ytdlp_path()
    if not ytdlp:
        raise Exception("yt-dlp not found")
    
    # Create unique filename
    file_id = download_id or str(uuid.uuid4())[:8]
    output_template = str(DOWNLOAD_DIR / f"%(title)s_{file_id}.%(ext)s")
    
    # Build command
    cmd = [
        ytdlp,
        '--no-warnings',
        '--progress',
        '--newline',
        '-o', output_template
    ]
    
    # Quality selection
    if quality != 'best' and quality.isdigit():
        if include_audio:
            # Best video up to specified height + best audio, merged
            cmd.extend([
                '-f', f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]',
                '--merge-output-format', 'mp4'
            ])
        else:
            cmd.extend(['-f', f'bestvideo[height<={quality}]/best[height<={quality}]'])
    else:
        if include_audio:
            cmd.extend(['-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4'])
        else:
            cmd.extend(['-f', 'bestvideo/best'])
    
    # Add cookies if available
    cookies_file = Path(__file__).parent / 'cookies.txt'
    if cookies_file.exists():
        cmd.extend(['--cookies', str(cookies_file)])
    
    cmd.append(url)
    
    # Set up download tracking
    if download_id:
        downloads[download_id] = {
            'status': 'downloading',
            'progress': 0,
            'speed': '',
            'eta': '',
            'filename': None
        }
    
    # Run download
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    output_file = None
    
    for line in process.stdout:
        line = line.strip()
        
        # Parse progress
        if '[download]' in line:
            # Extract percentage
            percent_match = re.search(r'(\d+\.?\d*)%', line)
            if percent_match and download_id:
                downloads[download_id]['progress'] = float(percent_match.group(1))
            
            # Extract speed
            speed_match = re.search(r'at\s+([\d.]+\w+/s)', line)
            if speed_match and download_id:
                downloads[download_id]['speed'] = speed_match.group(1)
            
            # Extract ETA
            eta_match = re.search(r'ETA\s+(\d+:\d+)', line)
            if eta_match and download_id:
                downloads[download_id]['eta'] = eta_match.group(1)
            
            # Extract filename
            dest_match = re.search(r'Destination:\s+(.+)$', line)
            if dest_match:
                output_file = dest_match.group(1)
                if download_id:
                    downloads[download_id]['filename'] = output_file
        
        # Merging phase
        if '[Merger]' in line or 'Merging' in line:
            if download_id:
                downloads[download_id]['status'] = 'merging'
                downloads[download_id]['progress'] = 95
    
    process.wait()
    
    if process.returncode != 0:
        if download_id:
            downloads[download_id]['status'] = 'error'
        raise Exception("Download failed")
    
    # Find the output file
    if not output_file:
        # Look for most recent file in download dir
        files = list(DOWNLOAD_DIR.glob(f"*_{file_id}.*"))
        if files:
            output_file = str(max(files, key=os.path.getmtime))
    
    if download_id:
        downloads[download_id]['status'] = 'complete'
        downloads[download_id]['progress'] = 100
        downloads[download_id]['filename'] = output_file
    
    return output_file

# ============ API Routes ============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    ytdlp = get_ytdlp_path()
    return jsonify({
        'status': 'ok',
        'ytdlp_available': ytdlp is not None,
        'ytdlp_path': ytdlp
    })

@app.route('/api/info', methods=['POST'])
def get_info():
    """Get video information"""
    data = request.get_json()
    url = data.get('url', '').strip()
    platform = data.get('platform', 'youtube')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    try:
        info = fetch_video_info(url, platform)
        return jsonify({
            'success': True,
            'data': info
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/download', methods=['POST'])
def start_download():
    """Start a download"""
    data = request.get_json()
    url = data.get('url', '').strip()
    quality = data.get('quality', 'best')
    include_audio = data.get('includeAudio', True)
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    # Generate download ID
    download_id = str(uuid.uuid4())[:8]
    
    # Start download in background thread
    def do_download():
        try:
            download_video(url, quality, include_audio, download_id)
        except Exception as e:
            downloads[download_id] = {
                'status': 'error',
                'error': str(e),
                'progress': 0
            }
    
    thread = threading.Thread(target=do_download)
    thread.start()
    
    return jsonify({
        'success': True,
        'downloadId': download_id
    })

@app.route('/api/download/<download_id>/status', methods=['GET'])
def download_status(download_id):
    """Get download status"""
    if download_id not in downloads:
        return jsonify({'error': 'Download not found'}), 404
    
    return jsonify({
        'success': True,
        'data': downloads[download_id]
    })

@app.route('/api/download/<download_id>/file', methods=['GET'])
def get_download_file(download_id):
    """Get the downloaded file"""
    if download_id not in downloads:
        return jsonify({'error': 'Download not found'}), 404
    
    download = downloads[download_id]
    if download['status'] != 'complete':
        return jsonify({'error': 'Download not complete'}), 400
    
    filename = download.get('filename')
    if not filename or not os.path.exists(filename):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(
        filename,
        as_attachment=True,
        download_name=os.path.basename(filename)
    )

@app.route('/api/instagram/user/<username>', methods=['GET'])
def get_instagram_user(username):
    """Get Instagram user media (requires cookies)"""
    # This would require Instagram session cookies
    # For now, return a message about requirements
    return jsonify({
        'success': False,
        'error': 'Instagram user downloads require authentication. Please paste a direct post/reel URL instead.',
        'requiresAuth': True
    }), 400

# ============ Streaming Download ============

@app.route('/api/stream', methods=['POST'])
def stream_download():
    """Stream the download directly to client"""
    data = request.get_json()
    url = data.get('url', '').strip()
    quality = data.get('quality', 'best')
    include_audio = data.get('includeAudio', True)
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    ytdlp = get_ytdlp_path()
    if not ytdlp:
        return jsonify({'error': 'yt-dlp not found'}), 500
    
    # First get video info for filename
    try:
        info = fetch_video_info(url)
        filename = sanitize_filename(info['title']) + '.mp4'
    except:
        filename = 'video.mp4'
    
    # Build yt-dlp command to output to stdout
    cmd = [
        ytdlp,
        '--no-warnings',
        '-o', '-'  # Output to stdout
    ]
    
    if quality != 'best' and quality.isdigit():
        if include_audio:
            cmd.extend(['-f', f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]'])
        else:
            cmd.extend(['-f', f'bestvideo[height<={quality}]/best[height<={quality}]'])
    else:
        if include_audio:
            cmd.extend(['-f', 'bestvideo+bestaudio/best'])
        else:
            cmd.extend(['-f', 'bestvideo/best'])
    
    cmd.extend(['--merge-output-format', 'mp4'])
    cmd.append(url)
    
    def generate():
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        while True:
            chunk = process.stdout.read(8192)
            if not chunk:
                break
            yield chunk
        
        process.wait()
    
    return Response(
        generate(),
        mimetype='video/mp4',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
    )

# ============ Cleanup ============

def cleanup_old_downloads():
    """Remove downloads older than 1 hour"""
    now = time.time()
    for file in DOWNLOAD_DIR.iterdir():
        if file.is_file():
            age = now - file.stat().st_mtime
            if age > 3600:  # 1 hour
                try:
                    file.unlink()
                except:
                    pass

# ============ Main ============

if __name__ == '__main__':
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║                  MediaGrab Pro Server                    ║
    ║──────────────────────────────────────────────────────────║
    ║  Video Downloader Backend for YouTube, Instagram,        ║
    ║  Facebook, and WhatsApp                                  ║
    ║──────────────────────────────────────────────────────────║
    ║  Requirements:                                           ║
    ║  • Python 3.8+                                           ║
    ║  • pip install flask flask-cors yt-dlp                   ║
    ║  • yt-dlp (pip install yt-dlp)                           ║
    ║  • ffmpeg (for merging audio/video)                      ║
    ║──────────────────────────────────────────────────────────║
    ║  API Endpoints:                                          ║
    ║  • GET  /api/health         - Health check               ║
    ║  • POST /api/info           - Get video info             ║
    ║  • POST /api/download       - Start download             ║
    ║  • GET  /api/download/:id/status - Download status       ║
    ║  • GET  /api/download/:id/file   - Get file              ║
    ║  • POST /api/stream         - Stream download            ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # Check dependencies
    ytdlp = get_ytdlp_path()
    if ytdlp:
        print(f"  ✓ yt-dlp found: {ytdlp}")
    else:
        print("  ✗ yt-dlp not found! Install with: pip install yt-dlp")
    
    # Check ffmpeg
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True)
        print("  ✓ ffmpeg found")
    except:
        print("  ✗ ffmpeg not found! Required for merging audio/video")
    
    print("\n  Starting server on http://localhost:5000")
    print("  Press Ctrl+C to stop\n")
    
    # Start cleanup thread
    def cleanup_loop():
        while True:
            time.sleep(300)  # Every 5 minutes
            cleanup_old_downloads()
    
    cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    cleanup_thread.start()
    
    # Run app
    port=int(os.environ.get("PORT",5000))
    app.run(host='0.0.0.0', port=port, debug=True, threaded=True)

