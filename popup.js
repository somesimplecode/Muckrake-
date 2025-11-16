//@ts-check

let isListening = false;
let mediaRecorder = null;
let audioStream = null;
let currentTabId = null;
let audioChunks = [];

const button = document.getElementById('toggleButton');
const stat = document.getElementById('status');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');

const progressList = document.getElementById('progressList');
const buttonLabel = document.getElementById('buttonLabel');
const buttonThrobber = document.getElementById('buttonThrobber');

const key1Input = /** @type {HTMLInputElement} */ (document.getElementById('key1Input'));
const saveKey1Btn = document.getElementById('saveKey1Btn');
const key2Input = /** @type {HTMLInputElement} */ (document.getElementById('key2Input'));
const saveKey2Btn = document.getElementById('saveKey2Btn');
const key3Input = /** @type {HTMLInputElement} */ (document.getElementById('key3Input'));
const saveKey3Btn = document.getElementById('saveKey3Btn');
const key4Input = /** @type {HTMLInputElement} */ (document.getElementById('key4Input'));
const saveKey4Btn = document.getElementById('saveKey4Btn');

const manualSearchBtn = document.getElementById('manualSearchBtn');
const manualClaimInput = /** @type {HTMLInputElement} */ (document.getElementById('manualClaimInput'));

async function ensureContentScript(tabId) {
    return new Promise((resolve, reject) => {
        // First, try a ping to see if content.js is already there
        chrome.tabs.sendMessage(
            tabId,
            { action: 'ping' },
            (response) => {
                if (!chrome.runtime.lastError && response && response.status === 'ok') {
                    // Content script already loaded
                    resolve(undefined);
                } else {
                    // Inject content.js into the tab
                    chrome.scripting.executeScript(
                        {
                            target: { tabId },
                            files: ['content.js']
                        },
                        () => {
                            if (chrome.runtime.lastError) {
                                console.error('Failed to inject content script:', chrome.runtime.lastError.message);
                                reject(chrome.runtime.lastError);
                            } else {
                                console.log('Content script injected into tab', tabId);
                                resolve(undefined);
                            }
                        }
                    );
                }
            }
        );
    });
}

function setStatus(message) {
    if (stat) {
        stat.textContent = message;
    }
}

function setListeningUI(listening) {
    if (!button || !buttonLabel || !buttonThrobber) return;

    if (listening) {
        buttonLabel.textContent = "Listening... (click to stop)";
        buttonThrobber.classList.remove('hidden');
        button.disabled = false;

    } else {
        buttonLabel.textContent = "Start Listening";
        buttonThrobber.classList.add('hidden');
        button.disabled = false;
    }
}

function showProgress() {
    if (progressList) {
        progressList.classList.add('active');
    }
}

function hideProgress() {
    if (!progressList) return;
    progressList.classList.remove('active');
    const items = progressList.querySelectorAll('.step-item');
    items.forEach(li => li.classList.remove('active', 'done'));
}

function setStep(stepName) {
    if (!progressList) return;

    const items = progressList.querySelectorAll('.step-item');
    let reachedCurrent = false;

    items.forEach(li => {
        const thisStep = li.dataset.step;
        li.classList.remove('active', 'done');

        if (thisStep === stepName) {
            li.classList.add('active');
            reachedCurrent = true;
        } else if (!reachedCurrent) {
            li.classList.add('done');
        }
    });
}

if (!button) {
    console.error("Toggle button not found.");
} else if (!stat) {
    console.error("Status element not found.");
} else {
    button.addEventListener('click', () => {
        if (isListening) {
            stopListening();
            isListening = false;
            setListeningUI(false);
            setStatus("Processing recording...");
            showProgress();
            setStep('upload');
        } else {
            hideProgress();
            isListening = true;
            setListeningUI(true);
            setStatus("Listening...");
            startListening();
        }
    });
}

if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
        if (settingsPanel.style.display === 'none' || settingsPanel.style.display === '') {
            settingsPanel.style.display = 'block';
            settingsBtn.textContent = '⚙️ Hide Settings';
        } else {
            settingsPanel.style.display = 'none';
            settingsBtn.textContent = '⚙️ Settings';
        }
    });
}

chrome.storage.local.get(['assemblyApiKey', 'openaiApiKey', 'googleApiKey', 'googleSearchKey'], (result) => {
    if (result.assemblyApiKey && key1Input) {
        key1Input.value = result.assemblyApiKey;
    }
    if (result.openaiApiKey && key2Input) {
        key2Input.value = result.openaiApiKey;
    }
    if (result.googleApiKey && key3Input) {
        key3Input.value = result.googleApiKey;
    }
    if (result.googleSearchKey && key4Input) {
        key4Input.value = result.googleSearchKey;
    }
});

if (saveKey1Btn && key1Input) {
    saveKey1Btn.addEventListener('click', () => {
        const apiKey = key1Input.value.trim();
        chrome.storage.local.set({ assemblyApiKey: apiKey }, () => {
            console.log('Transcription key saved');
            alert('Transcription Key Saved!');
        });
    });
}

if (saveKey2Btn && key2Input) {
    saveKey2Btn.addEventListener('click', () => {
        const apiKey = key2Input.value.trim();
        chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
            console.log('AI Analysis key saved');
            alert('AI Analysis Key Saved!');
        });
    });
}

if (saveKey3Btn && key3Input) {
    saveKey3Btn.addEventListener('click', () => {
        const apiKey = key3Input.value.trim();
        chrome.storage.local.set({ googleApiKey: apiKey }, () => {
            console.log('Fact checking key saved');
            alert('Fact Checking Key Saved!');
        });
    });
}

if (saveKey4Btn && key4Input) {
    saveKey4Btn.addEventListener('click', () => {
        const engineId = key4Input.value.trim();
        chrome.storage.local.set({ googleSearchKey: engineId }, () => {
            console.log('Engine ID saved');
            alert('Engine ID Saved!');
        });
    });
}

if (manualSearchBtn && manualClaimInput) {
    manualSearchBtn.addEventListener('click', async () => {
        const claim = manualClaimInput.value.trim();

        if (!claim) {
            alert('Please enter a claim to fact-check.');
            return;
        }

        manualSearchBtn.disabled = true;
        manualSearchBtn.textContent = 'Checking...';
        setStatus('Fact-checking your claim...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || tab.id == null) {
                console.error("Popup: No active tab found.");
                alert('Could not access the current tab.');
                manualSearchBtn.disabled = false;
                manualSearchBtn.textContent = 'Check This Claim';
                return;
            }

            const searchResults = await searchForSources([claim], tab.id);

            if (searchResults.length === 0) {
                alert('No results found for this claim.');
                setStatus('No results found.');
            } else {
                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        action: 'resultsReady',
                        transcript: '',
                        claims: [claim],
                        results: searchResults
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn('Popup: Could not deliver results:', chrome.runtime.lastError.message);
                            setStatus('Fact-check complete, but could not show results.');
                        } else {
                            console.log('Popup: Manual search results delivered:', response);
                            setStatus('Fact-check complete!');
                            manualClaimInput.value = '';
                        }
                    }
                );
            }
        } catch (error) {
            console.error('Popup: Manual search error:', error);
            alert('Error during fact-check. Check console for details.');
            setStatus('Error during fact-check.');
        } finally {
            manualSearchBtn.disabled = false;
            manualSearchBtn.textContent = 'Check This Claim';
        }
    });

    manualClaimInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            manualSearchBtn.click();
        }
    });
}

async function startListening() {
    console.log("Popup: Started listening...");

    audioChunks = [];

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) {
        console.error("Popup: No active tab found.");
        return;
    }
    currentTabId = tab.id;

    try {
        await ensureContentScript(currentTabId);
    } catch (e) {
        console.error("Popup: Could not ensure content script:", e);
        setStatus("Error injecting content script.");
        return;
    }

    chrome.tabs.sendMessage(
        currentTabId,
        { action: 'startListening' },
        (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Popup: Content script not responding to startListening:', chrome.runtime.lastError.message);
            } else {
                console.log('Popup: Response from content script (startListening):', response);
            }
        }
    );

    chrome.tabCapture.capture(
        { audio: true, video: false },
        (stream) => {
            if (chrome.runtime.lastError) {
                console.error('Popup: tabCapture error:', chrome.runtime.lastError);
                return;
            }

            if (!stream) {
                console.error('Popup: No stream received from tabCapture');
                return;
            }

            console.log('Popup: Audio stream captured successfully');
            audioStream = stream;

            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    console.log('Popup: Audio chunk collected:', event.data.size, 'bytes');
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('Popup: MediaRecorder error:', event.error);
            };

            mediaRecorder.onstop = () => {
                console.log('Popup: MediaRecorder stopped, processing audio...');

                if (audioChunks.length > 0) {
                    const fullAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log('Popup: Full audio blob size:', fullAudioBlob.size, 'bytes');

                    setStatus("Uploading audio for transcription...");
                    setStep('upload');

                    sendAudioForTranscription(fullAudioBlob, currentTabId);
                }

                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                    audioStream = null;
                }
                mediaRecorder = null;
            };

            mediaRecorder.start(1000);
            console.log('Popup: MediaRecorder started');
        }
    );
}


function stopListening() {
    console.log("Popup: Stopped listening...");

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || tabs[0].id == null) return;
        chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'stopListening' },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Popup: Content script not responding to stopListening:', chrome.runtime.lastError.message);
                } else {
                    console.log('Popup: Response from content script (stopListening):', response);
                }
            }
        );
    });
}

async function sendAudioForTranscription(audioBlob, tabId) {
    const result = await chrome.storage.local.get(['assemblyApiKey']);
    const ASSEMBLYAI_API_KEY = result.assemblyApiKey;

    if (!ASSEMBLYAI_API_KEY) {
        console.error('Popup: No API key found. Please enter it in the popup.');
        setStatus("No transcription API key found.");
        return;
    }

    try {
        console.log('Popup: Uploading audio to AssemblyAI...');
        setStatus("Uploading audio for transcription...");
        setStep('upload');

        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'Content-Type': 'application/octet-stream'
            },
            body: audioBlob
        });

        const uploadData = await uploadResponse.json();
        console.log('Popup: Upload response:', uploadData);

        if (!uploadData.upload_url) {
            console.error('Popup: Failed to upload audio');
            setStatus("Upload failed. Please try again.");
            return;
        }

        console.log('Popup: Requesting transcript...');
        setStatus("Transcribing audio...");
        setStep('transcription');

        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio_url: uploadData.upload_url
            })
        });

        const transcriptData = await transcriptResponse.json();
        console.log('Popup: Transcript requested:', transcriptData.id);

        pollForTranscript(transcriptData.id, tabId, ASSEMBLYAI_API_KEY);

    } catch (error) {
        console.error('Popup: Transcription error:', error);
        setStatus("Error during transcription.");
    }
}

async function pollForTranscript(transcriptId, tabId, apiKey) {
    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;

    while (true) {
        const response = await fetch(pollingEndpoint, {
            headers: {
                'authorization': apiKey
            }
        });

        const result = await response.json();
        console.log('Popup: Polling status:', result.status);

        if (result.status === 'queued' || result.status === 'processing') {
            setStatus("Transcribing audio...");
            setStep('transcription');
        }

        if (result.status === 'completed') {
            console.log('Popup: Transcription completed:', result.text);
            setStatus("Transcription ready. Extracting claims...");
            setStep('claims');

            const claims = await extractClaims(result.text);

            setStatus(`Found ${claims.length} claim(s). Checking sources...`);
            setStep('sources');

            const searchResults = await searchForSources(claims, tabId);

            setStep('done');
            setStatus("Fact-check complete! Showing results...");

            if (tabId != null) {
                chrome.tabs.sendMessage(
                    tabId,
                    {
                        action: 'resultsReady',
                        transcript: result.text,
                        claims: claims,
                        results: searchResults
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn(
                                'Popup: Could not deliver results to content script:',
                                chrome.runtime.lastError.message
                            );
                            setStatus("Fact-check complete, but we couldn’t show the overlay.");
                        } else {
                            console.log('Popup: Content script acknowledged results:', response);
                            setStatus("Fact-check complete! Results shown on the page.");
                        }
                    }
                );
            }

            break;
        } else if (result.status === 'error') {
            console.error('Popup: Transcription failed:', result.error);
            setStatus("Transcription failed.");
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}


async function extractClaims(transcript) {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    const OPENAI_API_KEY = result.openaiApiKey;

    if (!OPENAI_API_KEY) {
        console.error('Popup: No OpenAI API key found.');
        return [];
    }

    try {
        console.log('Popup: Extracting claims from transcript...');
        setStatus("Identifying factual claims...");

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a fact-checking assistant. Extract verifiable factual claims from transcripts. Return ONLY a JSON array of claims, no other text. Each claim should be a concise statement that can be fact-checked. Example: ["Person X said Y", "There were Z deaths in the incident"]'
                    },
                    {
                        role: 'user',
                        content: `Extract factual claims from this transcript:\n\n${transcript}`
                    }
                ],
                temperature: 0.3
            })
        });

        const data = await response.json();
        console.log('Popup: OpenAI response:', data);

        if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content;
            const claims = JSON.parse(content);
            console.log('Popup: Extracted claims:', claims);
            return claims;
        }

        return [];
    } catch (error) {
        console.error('Popup: Claim extraction error:', error);
        return [];
    }
}
async function searchForSources(claims, tabId) {
    const result = await chrome.storage.local.get(['googleApiKey', 'googleSearchKey']);
    const GOOGLE_API_KEY = result.googleApiKey;
    const SEARCH_ENGINE_ID = result.googleSearchKey;

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        console.error('Popup: Google API key or Search Engine ID not found.');
        return [];
    }

    const trustedDomains = [
        'bbc.com', 'bbc.co.uk',
        'cnn.com',
        'reuters.com',
        'apnews.com', 'ap.org',
        'nytimes.com',
        'washingtonpost.com',
        'theguardian.com',
        'npr.org',
        'aljazeera.com',
        'bloomberg.com',
        'forbes.com',
        'abc.net.au',
        'nbcnews.com',
        'cbsnews.com',
        'abcnews.go.com',
        'usatoday.com',
        'time.com',
        'newsweek.com',
        'politico.com',
        'thehill.com',
        'axios.com',
        'nbcbayarea.com',
        'timesofindia.indiatimes.com',
        'www.ndtv.com',
        'ncbi.nlm.nih.gov',
        'medlineplus.gov',
        'my.clevelandclinic.org',
        'hopkinsmedicine.org',
        'mayoclinic.org',
        'ign.org'
    ];

    try {
        console.log('Popup: Searching for sources for', claims.length, 'claims...');

        const results = [];

        setStatus("Checking sources for each claim...");

        for (let i = 0; i < claims.length; i++) {
            const claim = claims[i];
            console.log('Popup: Searching for:', claim);
            setStatus(`Checking sources (${i + 1}/${claims.length})...`);

            const searchQuery = await generateSimpleSearchQuery(claim);
            console.log('Popup: Search query:', searchQuery);

            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=10`
            );

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const trustedSources = [];
                const otherSources = [];

                data.items.forEach(item => {
                    const hostname = new URL(item.link).hostname.replace('www.', '');
                    const isTrusted = trustedDomains.some(domain => hostname.includes(domain));

                    const source = {
                        title: item.title,
                        url: item.link,
                        source: hostname,
                        publishedAt: new Date().toISOString(),
                        trusted: isTrusted
                    };

                    if (isTrusted) {
                        trustedSources.push(source);
                    } else {
                        otherSources.push(source);
                    }
                });

                console.log(`Popup: Found ${trustedSources.length} trusted, ${otherSources.length} other sources`);

                const allSources = [...trustedSources, ...otherSources];
                const relevanceCheck = await checkSourceRelevance(claim, allSources.slice(0, 5));

                console.log(`Popup: Relevance score: ${relevanceCheck.score}, Stance: ${relevanceCheck.stance} - ${relevanceCheck.reason}`);

                if (relevanceCheck.stance === 'refutes') {
                    results.push({
                        claim: claim,
                        verified: 'false',
                        sources: trustedSources.length > 0 ? trustedSources.slice(0, 3) : otherSources.slice(0, 3),
                        note: relevanceCheck.reason || 'Sources indicate this claim is false'
                    });
                    console.log(`Popup: FALSE/DEBUNKED - ${relevanceCheck.reason}`);

                } else if (relevanceCheck.score < 0.5) {
                    results.push({
                        claim: claim,
                        verified: 'needs-context',
                        sources: trustedSources.length > 0 ? trustedSources.slice(0, 3) : otherSources.slice(0, 3),
                        note: relevanceCheck.reason || 'Sources found but relevance unclear'
                    });
                    console.log(`Popup: NEEDS CONTEXT - ${relevanceCheck.reason}`);

                } else if (trustedSources.length > 0 && relevanceCheck.stance === 'supports') {
                    results.push({
                        claim: claim,
                        verified: 'verified',
                        sources: trustedSources.slice(0, 3)
                    });
                    console.log(`Popup: VERIFIED with ${trustedSources.length} trusted sources`);

                } else if (trustedSources.length > 0 && relevanceCheck.stance === 'neutral') {
                    results.push({
                        claim: claim,
                        verified: 'uncertain',
                        sources: trustedSources.slice(0, 3),
                        note: 'Sources discuss this topic but are unclear on verification'
                    });
                    console.log(`Popup: UNCERTAIN - Sources are neutral`);

                } else if (otherSources.length > 0) {
                    results.push({
                        claim: claim,
                        verified: 'uncertain',
                        sources: otherSources.slice(0, 3)
                    });
                    console.log(`Popup: UNCERTAIN - Non-news sources`);

                } else {
                    results.push({
                        claim: claim,
                        verified: 'unverified',
                        sources: []
                    });
                    console.log('Popup: UNVERIFIED - No sources found');
                }
            } else {
                results.push({
                    claim: claim,
                    verified: 'unverified',
                    sources: []
                });
                console.log('Popup: No search results found');
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        } 
        console.log('Popup: Search complete, results:', results);
        return results;

    } catch (error) {
        console.error('Popup: Source search error:', error);
        return [];
    }
}
async function generateSimpleSearchQuery(claim) {
        const result = await chrome.storage.local.get(['openaiApiKey']);
        const OPENAI_API_KEY = result.openaiApiKey;

        if (!OPENAI_API_KEY) {
            return claim
                .replace(/[^\w\s]/g, '')
                .split(' ')
                .filter(w => w.length > 3)
                .slice(0, 8)
                .join(' ');
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Extract 4-8 key search terms from this claim for Google search. Include names, places, specific events. Return only the keywords, no formatting.'
                        },
                        {
                            role: 'user',
                            content: claim
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 25
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const query = data.choices[0].message.content.trim();
                console.log('Popup: AI search query:', query);
                return query;
            }
        } catch (error) {
            console.error('Error generating search query:', error);
        }

        return claim.substring(0, 100);
    }

    async function checkSourceRelevance(claim, sources) {
        const result = await chrome.storage.local.get(['openaiApiKey']);
        const OPENAI_API_KEY = result.openaiApiKey;

        if (!OPENAI_API_KEY || sources.length === 0) {
            return { relevant: false, score: 0, stance: 'neutral' };
        }

        try {
            const sourceTitles = sources.map(s => s.title).join('\n');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a fact-checking assistant. Evaluate if the search results address the claim AND whether they support or refute it. Return ONLY a JSON object with: {"relevant": true/false, "score": 0.0-1.0, "stance": "supports"/"refutes"/"neutral", "reason": "brief explanation"}.\n\nGuidelines:\n- score 0.7+ means sources clearly address the claim\n- score below 0.5 means not relevant or only tangentially related\n- stance "supports": sources confirm/verify the claim is TRUE\n- stance "refutes": sources debunk/disprove the claim or say it\'s FALSE\n- stance "neutral": sources discuss topic but don\'t clearly support or refute\n- If the sources are off-topic or unrelated, explicitly include the phrase "do not address the claim" in the reason.'
                        },
                        {
                            role: 'user',
                            content: `Claim: "${claim}"\n\nSearch result titles:\n${sourceTitles}\n\nDo these search results address this claim? Do they support it (confirm it's true) or refute it (debunk it as false)?`
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 150
                })
            });

            const data = await response.json();

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const content = data.choices[0].message.content.trim();
                const evaluation = JSON.parse(content);
                console.log('Popup: Relevance check:', claim, '→', evaluation);
                return evaluation;
            }

            return { relevant: false, score: 0, stance: 'neutral' };
        } catch (error) {
            console.error('Popup: Relevance check error:', error);
            return { relevant: false, score: 0, stance: 'neutral' };
        }
    }








