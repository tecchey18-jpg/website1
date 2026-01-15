// ===== MediaGrab Pro - Video Downloader Application =====

// State Management
const state = {
    currentPlatform: null,
    currentContentType: null,
    currentInputType: 'url',
    selectedQuality: '1080',
    includeAudio: true,
    mediaInfo: null,
    isLoading: false,
    downloadProgress: 0,
    selectedMedia: new Set(),
    abortController: null
};

// Platform Configurations
const platforms = {
    youtube: {
        name: 'YouTube',
        color: '#ff0000',
        gradient: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
        contentTypes: [
            { id: 'video', label: 'Videos', icon: 'video' },
            { id: 'shorts', label: 'Shorts', icon: 'shorts' },
            { id: 'playlist', label: 'Playlist', icon: 'playlist' },
            { id: 'music', label: 'Music Only', icon: 'music' }
        ],
        supportsUsername: false,
        urlPatterns: [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
            /youtu\.be\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/
        ],
        placeholder: 'Paste YouTube video URL...'
    },
    instagram: {
        name: 'Instagram',
        color: '#e4405f',
        gradient: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
        contentTypes: [
            { id: 'reels', label: 'Reels', icon: 'reels' },
            { id: 'post', label: 'Posts', icon: 'post' },
            { id: 'story', label: 'Stories', icon: 'story' },
            { id: 'profile', label: 'Profile Pic', icon: 'profile' },
            { id: 'highlights', label: 'Highlights', icon: 'highlights' }
        ],
        supportsUsername: true,
        urlPatterns: [
            /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/stories\/([a-zA-Z0-9_.-]+)/,
            /instagram\.com\/([a-zA-Z0-9_.-]+)\/?$/
        ],
        placeholder: 'Paste Instagram URL or @username...'
    },
    facebook: {
        name: 'Facebook',
        color: '#1877f2',
        gradient: 'linear-gradient(135deg, #1877f2 0%, #0d5cbf 100%)',
        contentTypes: [
            { id: 'video', label: 'Videos', icon: 'video' },
            { id: 'reels', label: 'Reels', icon: 'reels' },
            { id: 'watch', label: 'Watch', icon: 'watch' },
            { id: 'live', label: 'Live Videos', icon: 'live' }
        ],
        supportsUsername: false,
        urlPatterns: [
            /facebook\.com\/.*\/videos\/(\d+)/,
            /facebook\.com\/watch\/\?v=(\d+)/,
            /facebook\.com\/reel\/(\d+)/,
            /fb\.watch\/([a-zA-Z0-9_-]+)/
        ],
        placeholder: 'Paste Facebook video URL...'
    },
    whatsapp: {
        name: 'WhatsApp',
        color: '#25d366',
        gradient: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
        contentTypes: [
            { id: 'status', label: 'Status', icon: 'status' }
        ],
        supportsUsername: false,
        urlPatterns: [],
        placeholder: 'WhatsApp Status Saver - Check instructions below...'
    }
};

// Quality Options
const qualityOptions = {
    '4320': { label: '8K', resolution: '4320p', bitrate: '~100 Mbps' },
    '2160': { label: '4K', resolution: '2160p', bitrate: '~45 Mbps' },
    '1440': { label: '2K', resolution: '1440p', bitrate: '~16 Mbps' },
    '1080': { label: 'FHD', resolution: '1080p', bitrate: '~8 Mbps' },
    '720': { label: 'HD', resolution: '720p', bitrate: '~5 Mbps' },
    '480': { label: 'SD', resolution: '480p', bitrate: '~2.5 Mbps' },
    '360': { label: 'Low', resolution: '360p', bitrate: '~1 Mbps' }
};

// DOM Elements
const elements = {
    platformsGrid: document.getElementById('platformsGrid'),
    downloadSection: document.getElementById('downloadSection'),
    downloadHeader: document.getElementById('downloadHeader'),
    indicatorIcon: document.getElementById('indicatorIcon'),
    indicatorName: document.getElementById('indicatorName'),
    contentTypes: document.getElementById('contentTypes'),
    inputTabs: document.getElementById('inputTabs'),
    usernameTab: document.getElementById('usernameTab'),
    urlInput: document.getElementById('urlInput'),
    qualityGrid: document.getElementById('qualityGrid'),
    fetchBtn: document.getElementById('fetchBtn'),
    previewSection: document.getElementById('previewSection'),
    progressSection: document.getElementById('progressSection'),
    errorSection: document.getElementById('errorSection'),
    privateNotice: document.getElementById('privateNotice'),
    resultsSection: document.getElementById('resultsSection'),
    resultsGrid: document.getElementById('resultsGrid'),
    toastContainer: document.getElementById('toastContainer')
};

// ===== Platform Selection =====
function selectPlatform(platformId) {
    state.currentPlatform = platformId;
    const platform = platforms[platformId];
    
    // Update active state on cards
    document.querySelectorAll('.platform-card').forEach(card => {
        card.classList.toggle('active', card.dataset.platform === platformId);
    });
    
    // Update indicator
    elements.indicatorIcon.innerHTML = document.querySelector(`[data-platform="${platformId}"] .platform-icon`).innerHTML;
    elements.indicatorIcon.className = `indicator-icon ${platformId}-icon`;
    elements.indicatorName.textContent = platform.name;
    
    // Update content types
    renderContentTypes(platform.contentTypes);
    state.currentContentType = platform.contentTypes[0].id;
    
    // Show/hide username tab
    if (elements.usernameTab) {
        elements.usernameTab.style.display = platform.supportsUsername ? 'flex' : 'none';
    }
    
    // Update input placeholder
    elements.urlInput.placeholder = platform.placeholder;
    elements.urlInput.value = '';
    
    // Reset sections
    hideAllSections();
    
    // Scroll to download section
    elements.downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    showToast('success', `${platform.name} selected! Paste your URL to continue.`);
}

function renderContentTypes(types) {
    elements.contentTypes.innerHTML = types.map((type, index) => `
        <button class="content-type-btn ${index === 0 ? 'active' : ''}" 
                data-type="${type.id}"
                onclick="selectContentType('${type.id}')">
            ${type.label}
        </button>
    `).join('');
}

function selectContentType(typeId) {
    state.currentContentType = typeId;
    
    document.querySelectorAll('.content-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === typeId);
    });
    
    hideAllSections();
}

// ===== Input Handling =====
function switchInputType(type) {
    state.currentInputType = type;
    
    document.querySelectorAll('.input-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.input === type);
    });
    
    const platform = platforms[state.currentPlatform];
    if (type === 'username') {
        elements.urlInput.placeholder = `Enter ${platform.name} username (e.g., @username)...`;
    } else {
        elements.urlInput.placeholder = platform.placeholder;
    }
    
    elements.urlInput.value = '';
    elements.urlInput.focus();
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        elements.urlInput.value = text;
        elements.urlInput.focus();
        showToast('success', 'Pasted from clipboard!');
    } catch (err) {
        showToast('error', 'Unable to access clipboard. Please paste manually.');
    }
}

// ===== Quality Selection =====
function selectQuality(quality) {
    state.selectedQuality = quality;
    
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.quality === quality);
    });
}

// ===== Navigation =====
function goBack() {
    state.currentPlatform = null;
    state.currentContentType = null;
    
    document.querySelectorAll('.platform-card').forEach(card => {
        card.classList.remove('active');
    });
    
    hideAllSections();
    elements.urlInput.value = '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAllSections() {
    elements.previewSection.style.display = 'none';
    elements.progressSection.style.display = 'none';
    elements.errorSection.style.display = 'none';
    elements.privateNotice.style.display = 'none';
    elements.resultsSection.style.display = 'none';
}

// ===== Fetch Media =====
async function fetchMedia() {
    const url = elements.urlInput.value.trim();
    
    if (!url) {
        showToast('warning', 'Please enter a URL or username first.');
        elements.urlInput.focus();
        return;
    }
    
    if (!state.currentPlatform) {
        showToast('warning', 'Please select a platform first.');
        return;
    }
    
    // Show loading state
    setLoading(true);
    hideAllSections();
    
    try {
        // Simulate API call for demo
        await simulateFetch(url);
        
    } catch (error) {
        showError('Failed to fetch media', error.message);
    } finally {
        setLoading(false);
    }
}

async function simulateFetch(url) {
    // Simulate network delay
    await delay(1500);
    
    // Validate URL format
    const platform = platforms[state.currentPlatform];
    const isValidUrl = state.currentInputType === 'username' || 
                       platform.urlPatterns.some(pattern => pattern.test(url));
    
    if (!isValidUrl && state.currentPlatform !== 'whatsapp') {
        throw new Error(`Invalid ${platform.name} URL format. Please check and try again.`);
    }
    
    // Simulate private account check for Instagram
    if (state.currentPlatform === 'instagram' && state.currentInputType === 'username') {
        const isPrivate = Math.random() < 0.2; // 20% chance of private
        if (isPrivate) {
            showPrivateNotice();
            return;
        }
        
        // Show multiple results for username
        showMultipleResults(url);
        return;
    }
    
    // WhatsApp special handling
    if (state.currentPlatform === 'whatsapp') {
        showWhatsAppInstructions();
        return;
    }
    
    // Generate mock media info
    const mediaInfo = generateMockMediaInfo(url);
    state.mediaInfo = mediaInfo;
    
    // Show preview
    showPreview(mediaInfo);
}

function generateMockMediaInfo(url) {
    const platform = platforms[state.currentPlatform];
    const titles = {
        youtube: [
            '4K Nature Documentary - Amazing Wildlife',
            'How to Build a Modern Web App in 2024',
            'Epic Gaming Montage - Best Plays Compilation',
            'Relaxing Music for Study and Work - 3 Hours'
        ],
        instagram: [
            'Summer Vibes 🌴✨',
            'New Recipe Alert! 🍕',
            'Travel Diaries: Exploring Paradise',
            'Fitness Journey Update 💪'
        ],
        facebook: [
            'Breaking News Update',
            'Viral Video of the Day',
            'Community Event Highlights',
            'Live Concert Recording'
        ]
    };
    
    const platformTitles = titles[state.currentPlatform] || titles.youtube;
    const randomTitle = platformTitles[Math.floor(Math.random() * platformTitles.length)];
    
    const durations = ['3:45', '10:23', '15:00', '45:30', '1:23:45'];
    const views = ['1.2M', '534K', '89K', '2.3M', '156K'];
    const sizes = ['45 MB', '120 MB', '250 MB', '1.2 GB', '500 MB'];
    
    return {
        id: Math.random().toString(36).substring(7),
        title: randomTitle,
        duration: durations[Math.floor(Math.random() * durations.length)],
        views: views[Math.floor(Math.random() * views.length)],
        thumbnail: generatePlaceholderThumbnail(),
        availableQualities: ['2160', '1440', '1080', '720', '480', '360'],
        maxQuality: '2160',
        estimatedSize: sizes[Math.floor(Math.random() * sizes.length)],
        platform: state.currentPlatform,
        url: url
    };
}

function generatePlaceholderThumbnail() {
    // Generate a gradient placeholder
    const colors = [
        ['#6366f1', '#a855f7'],
        ['#ec4899', '#f97316'],
        ['#10b981', '#06b6d4'],
        ['#f59e0b', '#ef4444']
    ];
    const [color1, color2] = colors[Math.floor(Math.random() * colors.length)];
    
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1}"/>
                    <stop offset="100%" style="stop-color:${color2}"/>
                </linearGradient>
            </defs>
            <rect width="640" height="360" fill="url(#grad)"/>
            <text x="320" y="180" font-family="Arial" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">▶</text>
        </svg>
    `)}`;
}

function showPreview(mediaInfo) {
    const thumbnailImg = document.getElementById('thumbnailImg');
    const previewTitle = document.getElementById('previewTitle');
    const previewDuration = document.getElementById('previewDuration');
    const previewViews = document.getElementById('previewViews');
    const previewQuality = document.getElementById('previewQuality');
    const previewSize = document.getElementById('previewSize');
    
    thumbnailImg.src = mediaInfo.thumbnail;
    previewTitle.textContent = mediaInfo.title;
    previewDuration.textContent = mediaInfo.duration;
    previewViews.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
        ${mediaInfo.views} views
    `;
    previewQuality.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        ${qualityOptions[mediaInfo.maxQuality]?.resolution || '1080p'} Available
    `;
    previewSize.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        ~${mediaInfo.estimatedSize}
    `;
    
    elements.previewSection.style.display = 'block';
    elements.previewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    showToast('success', 'Media found! Click download to save.');
}

function showMultipleResults(username) {
    const mockResults = [];
    const count = Math.floor(Math.random() * 8) + 4; // 4-12 results
    
    for (let i = 0; i < count; i++) {
        mockResults.push({
            id: `media-${i}`,
            type: ['reel', 'post', 'story'][Math.floor(Math.random() * 3)],
            thumbnail: generatePlaceholderThumbnail(),
            title: `Media ${i + 1} from @${username.replace('@', '')}`
        });
    }
    
    renderResults(mockResults);
    elements.resultsSection.style.display = 'block';
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderResults(results) {
    elements.resultsGrid.innerHTML = results.map(item => `
        <div class="result-card" data-id="${item.id}" onclick="toggleResultSelection('${item.id}')">
            <div class="result-checkbox"></div>
            <div class="result-thumbnail">
                <img src="${item.thumbnail}" alt="${item.title}">
                <span class="result-type-badge">${item.type}</span>
            </div>
            <div class="result-info">
                <p class="result-title">${item.title}</p>
                <button class="result-download-btn" onclick="event.stopPropagation(); downloadSingleResult('${item.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                </button>
            </div>
        </div>
    `).join('');
    
    updateSelectedCount();
}

function toggleResultSelection(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    
    if (state.selectedMedia.has(id)) {
        state.selectedMedia.delete(id);
        card.classList.remove('selected');
    } else {
        state.selectedMedia.add(id);
        card.classList.add('selected');
    }
    
    updateSelectedCount();
}

function selectAllMedia() {
    const allCards = document.querySelectorAll('.result-card');
    const allSelected = state.selectedMedia.size === allCards.length;
    
    allCards.forEach(card => {
        const id = card.dataset.id;
        if (allSelected) {
            state.selectedMedia.delete(id);
            card.classList.remove('selected');
        } else {
            state.selectedMedia.add(id);
            card.classList.add('selected');
        }
    });
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
        countEl.textContent = state.selectedMedia.size;
    }
}

function downloadSelected() {
    if (state.selectedMedia.size === 0) {
        showToast('warning', 'Please select at least one item to download.');
        return;
    }
    
    showToast('success', `Downloading ${state.selectedMedia.size} items...`);
    simulateDownload();
}

function downloadSingleResult(id) {
    showToast('success', 'Starting download...');
    simulateDownload();
}

function showPrivateNotice() {
    elements.privateNotice.style.display = 'block';
    elements.privateNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showWhatsAppInstructions() {
    showError(
        'WhatsApp Status Saver',
        'WhatsApp uses end-to-end encryption. To save statuses:\n\n' +
        '1. View the status on your phone\n' +
        '2. The files are saved in: Phone Storage > WhatsApp > Media > .Statuses\n' +
        '3. Copy the files before they expire (24 hours)\n\n' +
        'Note: You may need a file manager app to access hidden folders.'
    );
}

function showError(title, message) {
    const errorTitle = document.getElementById('errorTitle');
    const errorMessage = document.getElementById('errorMessage');
    
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    
    elements.errorSection.style.display = 'block';
    elements.errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function retryFetch() {
    hideAllSections();
    fetchMedia();
}

// ===== Download Media =====
async function downloadMedia() {
    if (!state.mediaInfo) {
        showToast('error', 'No media to download.');
        return;
    }
    
    elements.previewSection.style.display = 'none';
    elements.progressSection.style.display = 'block';
    
    await simulateDownload();
}

async function simulateDownload() {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressStatus = document.getElementById('progressStatus');
    const progressSpeed = document.getElementById('progressSpeed');
    const progressRemaining = document.getElementById('progressRemaining');
    
    state.downloadProgress = 0;
    
    const stages = [
        { percent: 5, status: 'Connecting to server...' },
        { percent: 15, status: 'Fetching video stream...' },
        { percent: 25, status: 'Fetching audio stream...' },
        { percent: 40, status: 'Downloading video...' },
        { percent: 60, status: 'Downloading audio...' },
        { percent: 80, status: 'Merging streams...' },
        { percent: 95, status: 'Finalizing...' },
        { percent: 100, status: 'Complete!' }
    ];
    
    for (const stage of stages) {
        await animateProgress(state.downloadProgress, stage.percent, 500);
        state.downloadProgress = stage.percent;
        progressFill.style.width = `${stage.percent}%`;
        progressPercent.textContent = `${stage.percent}%`;
        progressStatus.textContent = stage.status;
        
        // Random speed and time
        const speed = (Math.random() * 15 + 5).toFixed(1);
        const remaining = Math.max(0, Math.floor((100 - stage.percent) / 10));
        progressSpeed.textContent = `${speed} MB/s`;
        progressRemaining.textContent = remaining > 0 ? `~${remaining}s remaining` : 'Almost done';
        
        await delay(300);
    }
    
    // Download complete
    await delay(500);
    elements.progressSection.style.display = 'none';
    
    // Trigger file download (demo - normally would download actual file)
    triggerDownload();
    
    showToast('success', 'Download complete! Check your downloads folder.');
    
    // Reset
    setTimeout(() => {
        if (state.mediaInfo) {
            showPreview(state.mediaInfo);
        }
    }, 1000);
}

function animateProgress(from, to, duration) {
    return new Promise(resolve => {
        const start = performance.now();
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const current = from + (to - from) * easeOutQuad(progress);
            
            progressFill.style.width = `${current}%`;
            progressPercent.textContent = `${Math.round(current)}%`;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                resolve();
            }
        }
        
        requestAnimationFrame(update);
    });
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function triggerDownload() {
    // In a real app, this would download the actual file
    // For demo, we'll create a placeholder file
    const filename = state.mediaInfo ? 
        `${state.mediaInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_${state.selectedQuality}p.mp4` :
        'mediagrab_download.mp4';
    
    // Simulated download
    console.log(`Downloading: ${filename}`);
    
    // You would normally do:
    // const a = document.createElement('a');
    // a.href = downloadUrl;
    // a.download = filename;
    // a.click();
}

function cancelDownload() {
    if (state.abortController) {
        state.abortController.abort();
    }
    
    elements.progressSection.style.display = 'none';
    
    if (state.mediaInfo) {
        showPreview(state.mediaInfo);
    }
    
    showToast('warning', 'Download cancelled.');
}

function playPreview() {
    // In a real app, this would open a video player modal
    showToast('info', 'Preview not available in demo mode.');
}

// ===== Loading State =====
function setLoading(isLoading) {
    state.isLoading = isLoading;
    
    if (isLoading) {
        elements.fetchBtn.classList.add('loading');
        elements.fetchBtn.disabled = true;
    } else {
        elements.fetchBtn.classList.remove('loading');
        elements.fetchBtn.disabled = false;
    }
}

// ===== Toast Notifications =====
function showToast(type, message, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== FAQ Toggle =====
function toggleFaq(button) {
    const faqItem = button.parentElement;
    const isOpen = faqItem.classList.contains('open');
    
    // Close all other FAQs
    document.querySelectorAll('.faq-item.open').forEach(item => {
        item.classList.remove('open');
    });
    
    // Toggle current
    if (!isOpen) {
        faqItem.classList.add('open');
    }
}

// ===== Header Scroll Effect =====
function handleScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// ===== Utility Functions =====
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize scroll handler
    window.addEventListener('scroll', handleScroll);
    
    // Initialize audio checkbox
    const audioCheckbox = document.getElementById('includeAudio');
    if (audioCheckbox) {
        audioCheckbox.addEventListener('change', (e) => {
            state.includeAudio = e.target.checked;
        });
    }
    
    // Enter key to fetch
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchMedia();
        }
    });
    
    // Auto-paste detection
    elements.urlInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            // Check if pasted content is a valid URL
            const url = elements.urlInput.value;
            if (url && !state.currentPlatform) {
                // Try to detect platform from URL
                for (const [platformId, platform] of Object.entries(platforms)) {
                    if (platform.urlPatterns.some(pattern => pattern.test(url))) {
                        selectPlatform(platformId);
                        showToast('info', `${platform.name} URL detected!`);
                        break;
                    }
                }
            }
        }, 100);
    });
    
    // Initialize
    console.log('MediaGrab Pro initialized!');
});

// ===== Expose functions globally =====
window.selectPlatform = selectPlatform;
window.selectContentType = selectContentType;
window.switchInputType = switchInputType;
window.pasteFromClipboard = pasteFromClipboard;
window.selectQuality = selectQuality;
window.goBack = goBack;
window.fetchMedia = fetchMedia;
window.downloadMedia = downloadMedia;
window.cancelDownload = cancelDownload;
window.retryFetch = retryFetch;
window.playPreview = playPreview;
window.toggleResultSelection = toggleResultSelection;
window.selectAllMedia = selectAllMedia;
window.downloadSelected = downloadSelected;
window.downloadSingleResult = downloadSingleResult;
window.toggleFaq = toggleFaq;
