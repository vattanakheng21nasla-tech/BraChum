/**
 * Google AI Studio (Gemini API) Integration
 * Features:
 * - Dynamic Model Auto-Detection (queries Google ListModels API)
 * - Intelligent Version Ranking (prefers latest Flash models: 3.8-flash, 2.5-flash, etc.)
 * - Automatic Cascade Fallback (seamlessly switches if a model fails or is rate-limited)
 * - Flexible User Selection (Auto-Adaptive or manual override)
 */

class GeminiService {
  static STORAGE_KEY = 'brachum_gemini_api_key';
  static MODEL_KEY = 'brachum_gemini_model_preference';
  static ACTIVE_MODEL_KEY = 'brachum_active_model';

  static getApiKey() {
    return localStorage.getItem(this.STORAGE_KEY) || '';
  }

  static setApiKey(key) {
    if (key) {
      localStorage.setItem(this.STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  static hasApiKey() {
    return Boolean(this.getApiKey());
  }

  static getSelectedModel() {
    return localStorage.getItem(this.MODEL_KEY) || 'auto';
  }

  static setSelectedModel(model) {
    if (model) {
      localStorage.setItem(this.MODEL_KEY, model);
    } else {
      localStorage.removeItem(this.MODEL_KEY);
    }
  }

  /**
   * Intelligently sort any list of Gemini models:
   * 1. Flash models first (optimized for transcription speed & Khmer processing)
   * 2. Highest version number first (e.g. 3.8 > 2.5 > 1.5)
   * 3. Pro models next as intelligent fallbacks
   */
  static sortModels(modelList) {
    return [...modelList].sort((a, b) => {
      const aIsFlash = a.includes('flash');
      const bIsFlash = b.includes('flash');
      if (aIsFlash && !bIsFlash) return -1;
      if (!aIsFlash && bIsFlash) return 1;

      // Extract version number e.g. "3.8", "2.5", "1.5"
      const extractVer = (name) => {
        const m = name.match(/(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : 0;
      };
      const vA = extractVer(a);
      const vB = extractVer(b);
      if (vA !== vB) return vB - vA; // Highest version first!

      return a.localeCompare(b);
    });
  }

  /**
   * Fetch active models dynamically from Google AI Studio (ListModels API)
   * Completely future-proof: auto-discovers newly released models with zero code changes
   */
  static async getActiveModels(apiKey) {
    const fallbackList = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
        
        if (available.length > 0) {
          return this.sortModels(available);
        }
      }
    } catch (e) {
      console.warn('Could not query ListModels, using defaults:', e);
    }
    return fallbackList;
  }

  /**
   * Test if the provided or stored API Key is active and valid
   * Auto-detects and verifies working models dynamically
   */
  static async testApiKey(apiKey = null) {
    const key = apiKey || this.getApiKey();
    if (!key) throw new Error('សូមបញ្ចូល API Key ជាមុនសិន!');
    
    // Auto-detect all active models for this API Key
    const models = await this.getActiveModels(key);
    let lastErr = null;
    let workingModel = null;

    // Determine testing order based on user preference or auto-rank
    const pref = this.getSelectedModel();
    let testOrder = [...models];
    if (pref && pref !== 'auto' && testOrder.includes(pref)) {
      testOrder = [pref, ...testOrder.filter(m => m !== pref)];
    }

    for (const m of testOrder) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping' }] }]
          })
        });
        if (response.ok) {
          workingModel = m;
          localStorage.setItem(this.ACTIVE_MODEL_KEY, m);
          break;
        }
        const err = await response.json().catch(() => ({}));
        lastErr = new Error(`[${m}] ${err.error?.message || `HTTP ${response.status}`}`);
      } catch (e) {
        lastErr = e;
      }
    }

    if (!workingModel) {
      throw lastErr || new Error('មិនអាចភ្ជាប់ទៅកាន់ Google AI Studio បានទេ។');
    }

    return {
      activeModel: workingModel,
      allModels: models
    };
  }

  /**
   * Convert File or Blob to Base64 (without data:...;base64, prefix)
   */
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Transcribe and synthesize meeting from audio file using Google AI Studio
   * Includes Automatic Model Flexibility & Cascade Fallback
   */
  static async transcribeAudioWithGemini(file, onProgress = () => {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('សូមបញ្ចូល Google AI Studio API Key ជាមុនសិន!');
    }

    // Safety check for unsupported AMR format
    if (file.name && file.name.toLowerCase().endsWith('.amr')) {
      throw new Error('Google AI Studio មិនគាំទ្រឯកសារសម្លេងប្រភេទ .amr ទេ។ សូមប្តូរការកំណត់ក្នុងទូរស័ព្ទឱ្យថតជា M4A ឬ MP3 (ឬថតតាមកម្មវិធី Voice Memos, Telegram, WhatsApp) រួចសាកល្បងម្តងទៀត។');
    }

    onProgress('កំពុងរៀបចំឯកសារសម្លេង (Encoding audio)...');
    const base64Data = await this.fileToBase64(file);
    let name = (file.name || '').toLowerCase();
    let mimeType = file.type || '';
    if (name.endsWith('.m4a') || name.endsWith('.mp4') || mimeType.includes('quicktime') || mimeType.includes('mp4') || mimeType.includes('m4a')) {
      mimeType = 'audio/mp4';
    } else if (name.endsWith('.mp3') || mimeType.includes('mpeg') || mimeType.includes('mp3')) {
      mimeType = 'audio/mp3';
    } else if (name.endsWith('.wav') || mimeType.includes('wav')) {
      mimeType = 'audio/wav';
    } else if (name.endsWith('.aac') || mimeType.includes('aac')) {
      mimeType = 'audio/aac';
    } else if (name.endsWith('.ogg') || name.endsWith('.opus') || mimeType.includes('ogg') || mimeType.includes('opus')) {
      mimeType = 'audio/ogg';
    } else if (name.endsWith('.webm') || mimeType.includes('webm')) {
      mimeType = 'audio/webm';
    } else if (name.endsWith('.flac') || mimeType.includes('flac')) {
      mimeType = 'audio/flac';
    } else {
      mimeType = mimeType || 'audio/mp3';
    }

    onProgress('កំពុងស្វែងរក Model ដែលសកម្ម និងលឿនបំផុតពី Google AI Studio...');

    const promptText = `
អ្នកគឺជាអ្នកជំនាញកត់ត្រាកំណត់ហេតុរដ្ឋបាលផ្លូវការ នៃក្រសួងមហាផ្ទៃ (ព្រះរាជាណាចក្រកម្ពុជា)។
សូមស្តាប់ឯកសារសម្លេងនៃកិច្ចប្រជុំនេះដោយយកចិត្តទុកដាក់ (ដែលមានការសន្ទនាជាភាសាខ្មែរ ឬលាយភាសាអង់គ្លេស)។

សូមអនុវត្តភារកិច្ចចំនួន ២៖
១. បំប្លែងសម្លេងជាអក្សរ (Verbatim Transcription) ដោយបែងចែកអ្នកនិយាយ (ឧ. ឯកឧត្តមប្រធានអង្គប្រជុំ, វាគ្មិន ១, វាគ្មិន ២, លោកប្រធាននាយកដ្ឋាន...) ព្រមទាំងដាក់ពេលវេលា (Timestamp) ត្រឹមត្រូវ។
២. ស្រង់ខ្លឹមសារសំខាន់ៗរៀបចំជាទម្រង់កំណត់ហេតុរដ្ឋបាលផ្លូវការ៖
   - title: ប្រធានបទ ឬចំណងជើងកិច្ចប្រជុំជាភាសាខ្មែរ
   - chairperson: ឈ្មោះ ឬតួនាទីប្រធានអង្គប្រជុំ (បើមាន)
   - attendees: សមាសភាពចូលរួមដែលបានលើកឡើង
   - agenda: របៀបវារៈដែលបានពិភាក្សា (រាយជាចំណុច ១, ២, ៣)
   - proceedingsSummary: ដំណើរការប្រជុំ និងខ្លឹមសារពិភាក្សាសំខាន់ៗ
   - decisions: សេចក្តីសម្រេច ឬទិសដៅដឹកនាំរបស់ប្រធានអង្គប្រជុំ
   - actionItems: បញ្ជីកិច្ចការត្រូវអនុវត្តបន្ត (task, assignee, dueDate)

សូមបញ្ចេញលទ្ធផលមកវិញជា JSON សុទ្ធ (Valid JSON ONLY) តាមគំរូខាងក្រោម៖
{
  "title": "ចំណងជើងកិច្ចប្រជុំ",
  "chairperson": "ឯកឧត្តមប្រធានអង្គប្រជុំ",
  "attendees": "ថ្នាក់ដឹកនាំ និងមន្ត្រីរាជការជំនាញពាក់ព័ន្ធ",
  "agenda": "១. ...\\n២. ...",
  "proceedingsSummary": "សេចក្តីសង្ខេបដំណើរការពិភាក្សា...",
  "decisions": "១. ...\\n២. ...",
  "actionItems": [
    { "task": "កិច្ចការត្រូវធ្វើ", "assignee": "អ្នកទទួលខុសត្រូវ", "dueDate": "កាលបរិច្ឆេទ" }
  ],
  "transcript": [
    { "speaker": "ឯកឧត្តមប្រធានអង្គប្រជុំ", "timestamp": "00:05", "text": "ប្រសាសន៍បើកកិច្ចប្រជុំ..." },
    { "speaker": "វាគ្មិន ១", "timestamp": "00:45", "text": "ខ្លឹមសាររាយការណ៍..." }
  ]
}
`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95
      }
    };

    // Auto-adaptive model hierarchy with cascade fallback
    let allModels = await this.getActiveModels(apiKey);
    const pref = this.getSelectedModel();
    let models = [...allModels];
    if (pref && pref !== 'auto' && models.includes(pref)) {
      models = [pref, ...models.filter(m => m !== pref)];
    }

    let lastError = null;
    let attemptIndex = 0;

    for (const model of models) {
      attemptIndex++;
      try {
        if (attemptIndex > 1) {
          onProgress(`🔄 ប្តូរស្វ័យប្រវត្តទៅ Model បម្រុង [${model}] (ម៉ូឌែលទី ${attemptIndex}/${models.length})...`);
        } else {
          onProgress(`⚡ កំពុងបំប្លែងសម្លេងជាមួយ [${model}] នៃ Google AI Studio...`);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error ? errData.error.message : `HTTP ${response.status}`;
          throw new Error(`[${model}] ${errMsg}`);
        }

        const data = await response.json();
        onProgress(`✅ ជោគជ័យជាមួយ [${model}]! កំពុងរៀបចំកំណត់ហេតុរដ្ឋបាល...`);

        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        localStorage.setItem(this.ACTIVE_MODEL_KEY, model);
        return {
          ...this.parseJSONResponse(textOutput),
          usedModel: model
        };
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed, auto-trying next model in fallback chain...`, err);
      }
    }

    throw lastError || new Error('គ្រប់ Model ទាំងអស់មិនអាចដំណើរការបានទេ។');
  }

  /**
   * Clean and parse JSON from Gemini's response
   */
  static parseJSONResponse(rawText) {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      return JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse JSON directly:', clean);
      // Fallback: extract JSON substring if extra text was included
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(clean.substring(start, end + 1));
      }
      throw new Error('ទិន្នន័យពី AI មិនមែនជាទម្រង់ JSON ត្រឹមត្រូវ: ' + e.message);
    }
  }

  /**
   * Polish or refine minutes with Google AI Studio using auto-adaptive model
   */
  static async polishMinutesWithGemini(minutesHtml, instruction = 'កែសម្រួលពាក្យពេចន៍ឱ្យកាន់តែត្រឹមត្រូវតាមក្បួនរដ្ឋបាល') {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('សូមបញ្ចូល Google AI Studio API Key ជាមុនសិន!');
    }

    const models = await this.getActiveModels(apiKey);
    const pref = this.getSelectedModel();
    let targetModel = models[0] || 'gemini-3.8-flash';
    if (pref && pref !== 'auto' && models.includes(pref)) {
      targetModel = pref;
    }

    const promptText = `
អ្នកគឺជាអ្នកជំនាញរដ្ឋបាលជាន់ខ្ពស់នៃក្រសួងមហាផ្ទៃ។
នេះគឺជាខ្លឹមសារកំណត់ហេតុកិច្ចប្រជុំ៖
---
${minutesHtml}
---
សំណូមពរ៖ ${instruction}។
សូមកែសម្រួលខ្លឹមសារនេះឡើងវិញដោយរក្សារចនាសម្ព័ន្ធរដ្ឋបាល (ព្រះរាជាណាចក្រកម្ពុជា, ក្រសួងមហាផ្ទៃ, ៥ ផ្នែក) ឱ្យនៅដដែល តែបង្កើនភាពរលូន និងត្រឹមត្រូវនៃភាសារដ្ឋបាល។ បញ្ចេញលទ្ធផលជា HTML សុទ្ធ មិនបាច់ដាក់សញ្ញា \`\`\` ឡើយ។
`;

    // Try target model first, then fallback to other active models
    const tryModels = [targetModel, ...models.filter(m => m !== targetModel)];
    for (const m of tryModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          let result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (result.startsWith('```html')) {
            result = result.replace(/^```html/, '').replace(/```$/, '').trim();
          } else if (result.startsWith('```')) {
            result = result.replace(/^```/, '').replace(/```$/, '').trim();
          }
          return result;
        }
      } catch (e) {
        console.warn(`Polish failed with ${m}, trying fallback...`, e);
      }
    }

    throw new Error('មិនអាចកែសម្រួលកំណត់ហេតុជាមួយ Google AI Studio បានទេ។');
  }
}

window.GeminiService = GeminiService;
