# Muckrake- An AI powered real time fact checker

## Overview

Muckrake is a Chrome extension that fact-checks audio content in real-time. Listen to podcasts, videos, or streams while Muckrake verifies claims using AI and trusted news sources—displaying results in a beautiful vintage newspaper interface.

## Features

- **Real-time audio capture** from any tab
- **AI-powered claim extraction** using GPT-4o-mini
- **Automated source verification** from 30+ trusted news outlets
- **Vintage newspaper UI** with spinning entrance animation
- **Manual fact-checking** for quick claim verification
- **5-tier verification system**: Verified, False, Uncertain, Needs Context, Unverified

## Installation

### Prerequisites

You'll need API keys for :
- [AssemblyAI](https://www.assemblyai.com/) (audio transcription) (Free)
- [OpenAI](https://platform.openai.com/) (GPT-4o-mini) ($)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview) (Free)
- [Google Search Engine ID] 

### Step 1: Clone the Repository
### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/muckrake.git
cd muckrake
```

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `muckrake` folder from your cloned repository
5. The Muckrake extension should now appear in your extensions list

### Step 3: Pin the Extension (Optional)

1. Click the puzzle piece icon 🧩 in Chrome's toolbar
2. Find **Muckrake** in the list
3. Click the pin 📌 icon to keep it visible

## 🔑 Setup

### Get Your API Keys

#### 1. AssemblyAI API Key
1. Go to [AssemblyAI](https://www.assemblyai.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

#### 2. OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy and save the key immediately (it won't be shown again)

#### 3. Google Custom Search API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Custom Search API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

#### 4. Google Search Engine ID
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click **Add** to create a new search engine
3. Under "Sites to search", enter `www.google.com`
4. Create the search engine
5. Go to **Control Panel** → **Basics**
6. Copy your **Search engine ID**

### Configure the Extension

1. Click the Muckrake extension icon in Chrome
2. Click **⚙️ Settings**
3. Enter your API keys:
   - **Transcription Key**: AssemblyAI API Key
   - **AI Analysis Key**: OpenAI API Key
   - **Search API Key**: Google API Key
   - **Search Engine ID**: Google Search Engine ID
4. Click **Save** for each key

## Usage

### Method 1: Real-Time Audio Fact-Checking

1. Navigate to any webpage with audio/video content (YouTube, podcast sites, etc.)
2. Click the Muckrake extension icon
3. Click **Start Listening**
4. Play the audio/video content
5. Click **Stop** when you want to fact-check what you've heard
6. Wait for the newspaper-styled report to appear on your screen

### Method 2: Manual Claim Verification

1. Click the Muckrake extension icon
2. Enter a claim in the **Quick Fact-Check** field
3. Press **Enter** or click **Check This Claim**
4. View results instantly

### Understanding Results

| Status | Icon | Meaning |
|--------|------|---------|
| **Verified** | ✅ | Trusted sources confirm this claim is true |
| **False** | 🚫 | Sources actively debunk or disprove this claim |
| **Uncertain** | ❓ | Sources found but unclear or from unverified outlets |
| **Needs Context** | ⚠️ | Sources don't directly address this specific claim |
| **Unverified** | ❌ | No sources found |

## Trusted News Sources

Muckrake searches 30+ verified news outlets including:
- BBC, CNN, Reuters, Associated Press
- The New York Times, Washington Post, The Guardian
- NPR, Bloomberg, Forbes
- Medical: Mayo Clinic, Johns Hopkins, Cleveland Clinic, NIH
- And more...

## Limitations

- **Google API Quota**: Free tier allows 100 searches/day
- **Audio Capture**: Only works on tabs (not system audio)
- **Language**: Currently English only
- **Chrome Only**: Firefox and other browsers not supported yet

## Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3
- **APIs**: AssemblyAI, OpenAI GPT-4o-mini, Google Custom Search
- **Chrome APIs**: tabCapture, scripting, storage

## Project Structure
```
muckrake/
├── manifest.json         # Extension configuration
├── popup.html            # Extension popup UI
├── popup.js              # Main logic & API orchestration
├── popup.css             # Newspaper-themed popup styling
├── content.js            # Results overlay injection
├── results.css           # Newspaper-styled results display
├── sounds/
│   ├── typewriter.wav    # Sound effects
│   └── hot-off-press.wav
└── icon.png              # Extension icon
```

## Troubleshooting

### "No results found" / All claims show as UNVERIFIED
- **Check API keys**: Verify all keys are entered correctly in Settings
- **Check quota**: Google allows 100 free searches/day. Check your [quota](https://console.cloud.google.com/)
- **Check console**: Open DevTools (F12) and check for error messages

### Audio not capturing
- **Check permissions**: Ensure the extension has permission to capture audio
- **Try different site**: Some sites block audio capture
- **Reload page**: Refresh the page and try again

### Extension not loading
- **Check Developer Mode**: Must be enabled in `chrome://extensions/`
- **Check manifest**: Ensure `manifest.json` is valid JSON
- **Reload extension**: Click the refresh icon in `chrome://extensions/`

## API Costs

**Free Tier Limits:**
- **AssemblyAI**: 5 hours of audio/month free
- **OpenAI**: $5 free credit (new accounts)
- **Google Custom Search**: 100 searches/day free

**Estimated costs per fact-check:**
- ~$0.02-0.05 per fact-check (3 claims average)
- ~20-50 fact-checks per $1
