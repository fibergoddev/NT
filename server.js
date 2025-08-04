const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const API_KEY = 'YOUR_ACTUAL_API_KEY'; // Keep this secure on server

app.use(cors());
app.use(express.json());

app.post('/api/youtube-search', async (req, res) => {
    try {
        const { query, duration, order, maxResults = 12 } = req.body;
        
        const params = {
            part: 'snippet',
            maxResults,
            q: query,
            type: 'video',
            order,
            key: API_KEY
        };
        
        if (duration) params.videoDuration = duration;
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params });
        
        // Get video details
        const videoIds = response.data.items.map(item => item.id.videoId).join(',');
        const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'contentDetails,statistics',
                id: videoIds,
                key: API_KEY
            }
        });
        
        // Merge data
        const mergedData = response.data.items.map(item => {
            const details = detailsResponse.data.items?.find(d => d.id === item.id.videoId);
            return { ...item, details: details || {} };
        });
        
        res.json(mergedData);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
