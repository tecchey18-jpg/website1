const API_BASE_URL = '/api';

class MediaGrabAPI {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.abortControllers = new Map();
    }

    /**
     * Check if the server is running and yt-dlp is available
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return await response.json();
        } catch (error) {
            return { status: 'offline', ytdlp_available: false };
        }
    }

    /**
     * Fetch video information from URL
     * @param {string} url - Video URL
     * @param {string} platform - Platform name
     * @returns {Promise<Object>} Video information
     */
    async fetchVideoInfo(url, platform = 'youtube') {
        const response = await fetch(`${this.baseUrl}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, platform })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch video info');
        }

        return data.data;
    }

    /**
     * Start a download
     * @param {string} url - Video URL
     * @param {string} quality - Quality setting
     * @param {boolean} includeAudio - Whether to include audio
     * @returns {Promise<string>} Download ID
     */
    async startDownload(url, quality = 'best', includeAudio = true) {
        const response = await fetch(`${this.baseUrl}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, quality, includeAudio })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to start download');
        }

        return data.downloadId;
    }

    /**
     * Get download status
     * @param {string} downloadId - Download ID
     * @returns {Promise<Object>} Download status
     */
    async getDownloadStatus(downloadId) {
        const response = await fetch(`${this.baseUrl}/download/${downloadId}/status`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to get status');
        }

        return data.data;
    }

    /**
     * Poll download status until complete
     * @param {string} downloadId - Download ID
     * @param {function} onProgress - Progress callback
     * @returns {Promise<Object>} Final status
     */
    async pollDownloadStatus(downloadId, onProgress, interval = 500) {
        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    const status = await this.getDownloadStatus(downloadId);

                    if (onProgress) {
                        onProgress(status);
                    }

                    if (status.status === 'complete') {
                        resolve(status);
                    } else if (status.status === 'error') {
                        reject(new Error(status.error || 'Download failed'));
                    } else {
                        setTimeout(checkStatus, interval);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            checkStatus();
        });
    }

    /**
     * Get download file URL
     * @param {string} downloadId - Download ID
     * @returns {string} File URL
     */
    getDownloadFileUrl(downloadId) {
        return `${this.baseUrl}/download/${downloadId}/file`;
    }

    /**
     * Stream download directly to browser
     * @param {string} url - Video URL
     * @param {string} quality - Quality setting
     * @param {boolean} includeAudio - Whether to include audio
     */
    async streamDownload(url, quality = 'best', includeAudio = true) {
        const response = await fetch(`${this.baseUrl}/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, quality, includeAudio })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Stream failed');
        }

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'video.mp4';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }

        // Create download
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(downloadUrl);
    }
}

// Create global instance
const mediaGrabAPI = new MediaGrabAPI();

// ===== Integration with main app =====

// Override fetchMedia function to use real API
const originalFetchMedia = window.fetchMedia;

window.fetchMediaReal = async function () {
    const url = document.getElementById('urlInput').value.trim();

    if (!url) {
        showToast('warning', 'Please enter a URL first.');
        return;
    }

    // Check server health first
    const health = await mediaGrabAPI.healthCheck();
    if (health.status !== 'ok') {
        showToast('error', 'Backend server is not running or unreachable. Please check the server console.');
        setLoading(false);
        return;
    }

    if (!health.ytdlp_available) {
        showToast('error', 'Server configuration error: yt-dlp is missing. Please install it on the server.');
        setLoading(false);
        return;
    }

    setLoading(true);
    hideAllSections();

    try {
        const videoInfo = await mediaGrabAPI.fetchVideoInfo(url, state.currentPlatform);
        state.mediaInfo = videoInfo;
        showPreview(videoInfo);
        showToast('success', 'Video found! Ready to download.');
    } catch (error) {
        showError('Failed to fetch video', error.message);
    } finally {
        setLoading(false);
    }
};

// Override downloadMedia to use real API
window.downloadMediaReal = async function () {
    if (!state.mediaInfo) {
        showToast('error', 'No media to download.');
        return;
    }

    // Check server health
    const health = await mediaGrabAPI.healthCheck();
    if (health.status !== 'ok') {
        showToast('error', 'Backend server is offline. Cannot download.');
        return;
    }

    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'block';

    try {
        // Start download
        const downloadId = await mediaGrabAPI.startDownload(
            state.mediaInfo.url,
            state.selectedQuality,
            state.includeAudio
        );

        // Poll for progress
        await mediaGrabAPI.pollDownloadStatus(downloadId, (status) => {
            const progressFill = document.getElementById('progressFill');
            const progressPercent = document.getElementById('progressPercent');
            const progressStatus = document.getElementById('progressStatus');
            const progressSpeed = document.getElementById('progressSpeed');
            const progressRemaining = document.getElementById('progressRemaining');

            progressFill.style.width = `${status.progress}%`;
            progressPercent.textContent = `${Math.round(status.progress)}%`;
            progressStatus.textContent = status.status === 'merging' ? 'Merging audio/video...' : 'Downloading...';
            progressSpeed.textContent = status.speed || '-- MB/s';
            progressRemaining.textContent = status.eta ? `ETA: ${status.eta}` : 'Calculating...';
        });

        // Download complete - trigger file download
        window.location.href = mediaGrabAPI.getDownloadFileUrl(downloadId);

        document.getElementById('progressSection').style.display = 'none';
        showToast('success', 'Download complete!');

        setTimeout(() => {
            showPreview(state.mediaInfo);
        }, 1000);

    } catch (error) {
        document.getElementById('progressSection').style.display = 'none';
        showError('Download Failed', error.message);
    }
};

// Auto-detect if server is running and switch to real mode
document.addEventListener('DOMContentLoaded', async () => {
    const health = await mediaGrabAPI.healthCheck();

    if (health.status === 'ok' && health.ytdlp_available) {
        // Server is running - use real downloads
        window.fetchMedia = window.fetchMediaReal;
        window.downloadMedia = window.downloadMediaReal;
        console.log('MediaGrab Pro: Connected to backend server');
        showToast('success', 'Connected to download server!');
    } else {
        console.log('MediaGrab Pro: Running in demo mode');
    }
});

// Export API for direct use
window.mediaGrabAPI = mediaGrabAPI;
