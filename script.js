// YouTube API Configuration - UPDATED
const API_KEY = 'AIzaSyAtDD_g-O06B66u7OuMxSJ_JcK8O2q_ytU'; // Replace with your actual API key
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Global Variables
let currentPlayer = null;
let miniPlayer = null;
let currentVideoId = null;
let currentPlaylist = [];
let currentVideoIndex = 0;
let isFloatingMode = false;
let searchTimeout = null;
let settings = {
    autoplayNext: false,
    showAnnotations: true,
    defaultVolume: 50,
    defaultQuality: 'auto'
};

// CORS Proxy for API requests (Alternative method)
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSettings();
    setupEventListeners();
    setupNavigationRouter();
});

// Initialize YouTube IFrame API
function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API is ready');
}

// FIXED: Improved YouTube API Search Function
async function searchYouTubeVideos(query, duration = '', order = 'relevance') {
    if (!API_KEY || API_KEY.includes('[') || API_KEY === 'YOUR_YOUTUBE_API_KEY') {
        throw new Error('Please set a valid YouTube Data API key. Get one from https://console.cloud.google.com/');
    }
    
    try {
        // Method 1: Direct API call (may have CORS issues)
        let response;
        let url = `${API_BASE_URL}/search`;
        
        const params = new URLSearchParams({
            part: 'snippet',
            maxResults: '12',
            q: query,
            type: 'video',
            order: order,
            key: API_KEY
        });
        
        // Add duration filter if specified
        if (duration) {
            params.append('videoDuration', duration);
        }
        
        const fullUrl = `${url}?${params.toString()}`;
        console.log('Attempting API call to:', fullUrl);
        
        try {
            response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
        } catch (corsError) {
            console.log('CORS error detected, trying alternative method...');
            // Method 2: Using CORS proxy
            response = await fetch(`${CORS_PROXY}${fullUrl}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            
            // Handle specific error codes
            if (response.status === 403) {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message.includes('quota')) {
                    throw new Error('Daily API quota exceeded (10,000 units). Try again tomorrow or request quota increase.');
                } else if (errorData.error && errorData.error.message.includes('key')) {
                    throw new Error('Invalid API key. Please check your YouTube Data API key.');
                } else {
                    throw new Error(`API access denied: ${errorData.error?.message || 'Check your API key permissions'}`);
                }
            } else if (response.status === 400) {
                throw new Error('Invalid search parameters. Please check your search query.');
            } else {
                throw new Error(`API error (${response.status}): ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('No videos found for your search query.');
        }
        
        // Get additional video details
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        const detailsResponse = await fetchVideoDetails(videoIds);
        
        // Merge search results with video details
        return data.items.map(item => {
            const details = detailsResponse.items?.find(d => d.id === item.id.videoId);
            return {
                ...item,
                details: details || {}
            };
        });
        
    } catch (error) {
        console.error('Search Error:', error);
        throw error;
    }
}

// FIXED: Get video details with better error handling
async function fetchVideoDetails(videoIds) {
    try {
        const url = `${API_BASE_URL}/videos`;
        const params = new URLSearchParams({
            part: 'contentDetails,statistics,snippet',
            id: videoIds,
            key: API_KEY
        });
        
        const fullUrl = `${url}?${params.toString()}`;
        let response;
        
        try {
            response = await fetch(fullUrl);
        } catch (corsError) {
            response = await fetch(`${CORS_PROXY}${fullUrl}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        }
        
        if (!response.ok) {
            console.warn('Could not fetch video details, using basic info only');
            return { items: [] };
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Video details fetch failed:', error);
        return { items: [] };
    }
}

// IMPROVED: Search functionality with better error handling
async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const duration = document.getElementById('durationFilter').value;
    const order = document.getElementById('orderFilter').value;
    
    if (!query) {
        showError('Please enter a search term');
        return;
    }
    
    if (query.length < 2) {
        showError('Search term must be at least 2 characters long');
        return;
    }
    
    // Check if API key is set
    if (!API_KEY || API_KEY.includes('YOUR_YOUTUBE') || API_KEY.includes('[')) {
        showError('YouTube Data API key is not configured. Please add your API key to the script.');
        return;
    }
    
    showLoading(true);
    
    try {
        console.log('Starting search for:', query);
        const videos = await searchYouTubeVideos(query, duration, order);
        console.log('Search successful, found videos:', videos.length);
        displaySearchResults(videos);
        showSuccess(`Found ${videos.length} videos for "${query}"`);
    } catch (error) {
        console.error('Search failed:', error);
        
        // Show specific error messages
        if (error.message.includes('quota')) {
            showError('Daily API limit reached. Each search costs 100 units from your 10,000 daily quota. Try again tomorrow.');
        } else if (error.message.includes('key')) {
            showError('API Key Error: Please check that your YouTube Data API key is valid and has the correct permissions.');
        } else if (error.message.includes('CORS')) {
            showError('Network Error: Unable to access YouTube API due to browser restrictions. Try using the CORS proxy option.');
        } else {
            showError(`Search failed: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}

// ALTERNATIVE: Server-side search method (recommended)
async function searchWithServerProxy(query, duration = '', order = 'relevance') {
    try {
        // This would call your own server endpoint that makes the API call
        const response = await fetch('/api/youtube-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                duration,
                order,
                maxResults: 12
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Server proxy search failed: ${error.message}`);
    }
}

// IMPROVED: Better error display with actionable information
function showError(message) {
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    
    // Add helpful links for common errors
    let fullMessage = message;
    if (message.includes('API key')) {
        fullMessage += ' <br><small>Get your API key at: <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></small>';
    } else if (message.includes('quota')) {
        fullMessage += ' <br><small>Learn about quota: <a href="https://developers.google.com/youtube/v3/getting-started#quota" target="_blank">YouTube API Quota</a></small>';
    }
    
    errorMessage.innerHTML = fullMessage;
    errorToast.classList.add('show');
    
    // Auto-hide after 8 seconds for longer messages
    setTimeout(() => {
        errorToast.classList.remove('show');
    }, 8000);
}

// API Key validation helper
function validateApiKey() {
    if (!API_KEY || API_KEY.includes('YOUR_YOUTUBE') || API_KEY.includes('[') || API_KEY.length < 30) {
        showError(`
            <strong>API Key Required!</strong><br>
            1. Go to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a><br>
            2. Enable YouTube Data API v3<br>
            3. Create API Key<br>
            4. Replace 'YOUR_YOUTUBE_API_KEY' in script.js<br>
            5. Set API key restrictions for security
        `);
        return false;
    }
    return true;
}

// Enhanced initialization
function initializeApp() {
    showLoading(false);
    
    // Validate API key on startup
    if (!validateApiKey()) {
        console.error('API key validation failed');
        return;
    }
    
    // Load saved playlists
    loadPlaylists();
    
    // Setup search suggestions
    setupSearchSuggestions();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    console.log('App initialized successfully');
}

// Rest of your existing functions remain the same...
// (All other functions from the previous code stay unchanged)

// Updated Event Listeners Setup
function setupEventListeners() {
    // Search functionality with enhanced validation
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    searchBtn.addEventListener('click', () => {
        if (validateApiKey()) {
            performSearch();
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (validateApiKey()) {
                performSearch();
            }
        }
    });
    
    // Real-time search suggestions with debouncing
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (this.value.length >= 2 && validateApiKey()) {
                fetchSearchSuggestions(this.value);
            } else {
                hideSuggestions();
            }
        }, 500); // Increased delay to avoid quota exhaustion
    });
    
    // Rest of existing event listeners...
    setupPlayerControls();
    
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        this.classList.toggle('active');
    });
    
    setupSettings();
    setupFloatingPlayerDrag();
}

// All other functions remain exactly the same as in the previous code
// Just copy all the remaining functions from the previous script.js
