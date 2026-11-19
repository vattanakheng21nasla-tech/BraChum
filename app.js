/**
 * Main Application Controller
 * Connects UI, SpeechEngine, Google AI Studio (Gemini), Document Generator, and Storage
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentMeeting: {
      id: 'mtg_' + Date.now(),
      title: 'កំណត់ហេតុនៃកិច្ចប្រជុំការងាររដ្ឋបាល',
      ministry: 'ក្រសួងមហាផ្ទៃ',
      department: 'អគ្គនាយកដ្ឋានរដ្ឋបាល',
      date: new Date().toLocaleDateString('km-KH'),
      time: new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }),
      location: 'សាលប្រជុំក្រសួងមហាផ្ទៃ (ជាន់ទី២)',
      chairperson: 'ឯកឧត្តមប្រធានអង្គប្រជុំ',
      attendees: 'ថ្នាក់ដឹកនាំ និងមន្ត្រីរាជការជំនាញពាក់ព័ន្ធ',
      recorder: 'មន្ត្រីកត់ត្រាកំណត់ហេតុ',
      agenda: '១. ពិនិត្យវឌ្ឍនភាពការងាររដ្ឋបាលប្រចាំសប្តាហ៍\n២. ពិភាក្សាលើបញ្ហាប្រឈម និងសំណូមពរ\n៣. ទិសដៅការងារសប្តាហ៍បន្ទាប់',
      quickNotes: '',
      transcript: [],
      decisions: '១. ឯកភាពលើរបាយការណ៍ និងសូចនាករការងារដែលបានអនុវត្ត។\n២. ជំរុញការងាររដ្ឋបាលឱ្យបានរួចរាល់តាមផែនការកំណត់។',
      actionItems: [
        { task: 'រៀបចំរបាយការណ៍សង្ខេបដាក់ជូនថ្នាក់ដឹកនាំ', assignee: 'មន្ត្រីកត់ត្រា', dueDate: 'ថ្ងៃចន្ទសប្តាហ៍ក្រោយ' },
        { task: 'តាមដានការងារជំនាញតាមនាយកដ្ឋាននីមួយៗ', assignee: 'ការិយាល័យរដ្ឋបាល', dueDate: 'បន្តបន្ទាប់' }
      ]
    },
    speakers: ['ឯកឧត្តមប្រធានអង្គប្រជុំ', 'វាគ្មិន ១', 'វាគ្មិន ២', 'វាគ្មិន ៣'],
    currentSpeaker: 'ឯកឧត្តមប្រធានអង្គប្រជុំ',
    selectedAudioFile: null,
    savedMeetings: []
  };

  // DOM Elements
  const el = {
    // Header
    btnOpenGeminiModal: document.getElementById('btnOpenGeminiModal'),
    btnNewMeeting: document.getElementById('btnNewMeeting'),
    btnSaveMeeting: document.getElementById('btnSaveMeeting'),

    // Record panel
    timerDisplay: document.getElementById('timerDisplay'),
    visualizerCanvas: document.getElementById('visualizerCanvas'),
    btnRecordToggle: document.getElementById('btnRecordToggle'),
    btnPauseToggle: document.getElementById('btnPauseToggle'),
    statusBadge: document.getElementById('statusBadge'),
    selSpeaker: document.getElementById('selSpeaker'),
    btnAddSpeaker: document.getElementById('btnAddSpeaker'),
    selLanguage: document.getElementById('selLanguage'),
    txtQuickNotes: document.getElementById('txtQuickNotes'),
    micHelpBanner: document.getElementById('micHelpBanner'),
    btnSwitchToUpload: document.getElementById('btnSwitchToUpload'),
    recordedAudioBox: document.getElementById('recordedAudioBox'),
    recordedDurationText: document.getElementById('recordedDurationText'),
    liveRecordedAudioPlayer: document.getElementById('liveRecordedAudioPlayer'),
    btnTranscribeLiveRecordedAudio: document.getElementById('btnTranscribeLiveRecordedAudio'),

    // Tabs
    tabBtnRecord: document.getElementById('tabBtnRecord'),
    tabBtnUpload: document.getElementById('tabBtnUpload'),
    tabBtnMeta: document.getElementById('tabBtnMeta'),
    tabBtnHistory: document.getElementById('tabBtnHistory'),
    tabPaneRecord: document.getElementById('tabPaneRecord'),
    tabPaneUpload: document.getElementById('tabPaneUpload'),
    tabPaneMeta: document.getElementById('tabPaneMeta'),
    tabPaneHistory: document.getElementById('tabPaneHistory'),

    // Audio upload & Gemini
    audioFileInput: document.getElementById('audioFileInput'),
    uploadZone: document.getElementById('uploadZone'),
    selectedFileName: document.getElementById('selectedFileName'),
    audioPlayerContainer: document.getElementById('audioPlayerContainer'),
    audioElement: document.getElementById('audioElement'),
    btnTranscribeWithGemini: document.getElementById('btnTranscribeWithGemini'),
    aiProgressBox: document.getElementById('aiProgressBox'),
    aiProgressText: document.getElementById('aiProgressText'),

    // Metadata form
    inputMinistry: document.getElementById('inputMinistry'),
    inputDept: document.getElementById('inputDept'),
    inputTitle: document.getElementById('inputTitle'),
    inputDate: document.getElementById('inputDate'),
    inputTime: document.getElementById('inputTime'),
    inputLocation: document.getElementById('inputLocation'),
    inputChairperson: document.getElementById('inputChairperson'),
    inputAttendees: document.getElementById('inputAttendees'),
    inputRecorder: document.getElementById('inputRecorder'),
    inputAgenda: document.getElementById('inputAgenda'),
    inputDecisions: document.getElementById('inputDecisions'),

    // Transcript
    liveStreamBox: document.getElementById('liveStreamBox'),
    liveStreamText: document.getElementById('liveStreamText'),
    transcriptList: document.getElementById('transcriptList'),
    transcriptCountBadge: document.getElementById('transcriptCountBadge'),
    btnClearTranscript: document.getElementById('btnClearTranscript'),

    // Document
    documentSheet: document.getElementById('documentSheet'),
    btnGenerateMinutes: document.getElementById('btnGenerateMinutes'),
    btnExportDocx: document.getElementById('btnExportDocx'),
    btnPrintPDF: document.getElementById('btnPrintPDF'),
    btnCopyMinutes: document.getElementById('btnCopyMinutes'),
    btnDownloadBackup: document.getElementById('btnDownloadBackup'),

    // History list
    historyListContainer: document.getElementById('historyListContainer'),

    // Mobile & Tablet Navigation
    mobileViewNav: document.getElementById('mobileViewNav'),
    mobileTranscriptBadge: document.getElementById('mobileTranscriptBadge'),

    // Gemini Modal
    modalGemini: document.getElementById('modalGemini'),
    inputGeminiApiKey: document.getElementById('inputGeminiApiKey'),
    selGeminiModel: document.getElementById('selGeminiModel'),
    btnSaveGeminiApiKey: document.getElementById('btnSaveGeminiApiKey'),
    btnCancelGeminiModal: document.getElementById('btnCancelGeminiModal'),
    btnTestGeminiApiKey: document.getElementById('btnTestGeminiApiKey'),
    apiKeyTestStatus: document.getElementById('apiKeyTestStatus'),

    // Speaker Edit Modal
    modalSpeaker: document.getElementById('modalSpeaker'),
    inputOldSpeaker: document.getElementById('inputOldSpeaker'),
    inputNewSpeaker: document.getElementById('inputNewSpeaker'),
    btnConfirmSpeakerRename: document.getElementById('btnConfirmSpeakerRename'),
    btnCancelSpeakerModal: document.getElementById('btnCancelSpeakerModal')
  };

  // Initialize Speech Engine with gentle mic error handling
  const speechEngine = new SpeechEngine({
    lang: 'km-KH',
    visualizerCanvas: el.visualizerCanvas,
    onInterim: (text) => {
      el.liveStreamBox.style.display = 'block';
      el.liveStreamText.textContent = text;
    },
    onResult: (result) => {
      el.liveStreamBox.style.display = 'none';
      el.liveStreamText.textContent = '';
      addTranscriptItem(result);
    },
    onMicError: (err) => {
      // Gracefully show help banner instead of blocking alert
      el.micHelpBanner.style.display = 'block';
      el.statusBadge.className = 'status-badge status-idle';
      el.statusBadge.innerHTML = '⚠️ Mic មិនដំណើរការ';
    },
    onAudioRecorded: (blob, durationSeconds) => {
      state.lastRecordedAudioBlob = blob;
      el.recordedAudioBox.style.display = 'block';
      el.recordedDurationText.textContent = speechEngine.formatTime(durationSeconds);
      const url = URL.createObjectURL(blob);
      el.liveRecordedAudioPlayer.src = url;
    },
    onStatusChange: (status) => {
      if (status === 'recording') {
        el.statusBadge.className = 'status-badge status-rec';
        el.statusBadge.innerHTML = '● កំពុងថតសម្លេង & បំប្លែង';
        el.btnRecordToggle.className = 'mic-btn recording';
        el.btnRecordToggle.innerHTML = '⏹';
        el.btnRecordToggle.title = 'បញ្ឈប់ការថត';
        el.btnPauseToggle.style.display = 'inline-flex';
        el.btnPauseToggle.innerHTML = '⏸ ផ្អាក';
        el.micHelpBanner.style.display = 'none';
      } else if (status === 'paused') {
        el.statusBadge.className = 'status-badge status-pause';
        el.statusBadge.innerHTML = '❚❚ បានផ្អាកបណ្តោះអាសន្ន';
        el.btnPauseToggle.innerHTML = '▶ បន្តថត';
      } else {
        el.statusBadge.className = 'status-badge status-idle';
        el.statusBadge.innerHTML = '○ មិនទាន់ចាប់ផ្តើម';
        el.btnRecordToggle.className = 'mic-btn';
        el.btnRecordToggle.innerHTML = '🎤';
        el.btnRecordToggle.title = 'ចាប់ផ្តើមថត';
        el.btnPauseToggle.style.display = 'none';
      }
    },
    onTimerTick: (formattedTime) => {
      el.timerDisplay.textContent = formattedTime;
    }
  });

  speechEngine.setSpeaker(state.currentSpeaker);

  // Switch to upload tab button
  el.btnSwitchToUpload.addEventListener('click', () => {
    el.tabBtnUpload.click();
  });

  // Google AI Studio (Gemini) Modal Actions
  el.btnOpenGeminiModal.addEventListener('click', async () => {
    el.inputGeminiApiKey.value = GeminiService.getApiKey();
    el.apiKeyTestStatus.style.display = 'none';

    // Load model preference
    const currentPref = GeminiService.getSelectedModel();
    if (el.selGeminiModel) {
      el.selGeminiModel.value = currentPref;
    }

    el.modalGemini.classList.add('open');

    // Populate model list if API key exists
    const key = GeminiService.getApiKey();
    if (key && el.selGeminiModel) {
      try {
        const models = await GeminiService.getActiveModels(key);
        populateModelDropdown(models, currentPref);
      } catch (e) {
        console.warn('Could not load models on modal open:', e);
      }
    }
  });

  function populateModelDropdown(models, selectedValue = 'auto') {
    if (!el.selGeminiModel) return;
    el.selGeminiModel.innerHTML = `
      <option value="auto">✨ ស្វ័យប្រវត្តិ (Auto-Adaptive - ជ្រើសរើស Model ថ្មី និងលឿនបំផុត)</option>
    `;
    models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      let label = m;
      if (m.includes('3.8-flash')) label += ' (ណែនាំ - ថ្មីបំផុត)';
      else if (m.includes('flash')) label += ' (លឿន & ពេញនិយម)';
      opt.textContent = label;
      el.selGeminiModel.appendChild(opt);
    });
    if (selectedValue) {
      el.selGeminiModel.value = selectedValue;
    }
  }

  if (el.selGeminiModel) {
    el.selGeminiModel.addEventListener('change', () => {
      GeminiService.setSelectedModel(el.selGeminiModel.value);
    });
  }

  el.btnCancelGeminiModal.addEventListener('click', () => {
    el.modalGemini.classList.remove('open');
  });

  el.btnSaveGeminiApiKey.addEventListener('click', () => {
    const key = el.inputGeminiApiKey.value.trim();
    if (!key) {
      if (confirm('តើលោកអ្នកចង់លុប API Key ចេញមែនទេ?')) {
        GeminiService.setApiKey('');
        el.modalGemini.classList.remove('open');
      }
      return;
    }
    GeminiService.setApiKey(key);
    if (el.selGeminiModel) {
      GeminiService.setSelectedModel(el.selGeminiModel.value);
    }
    el.modalGemini.classList.remove('open');
    alert('បានរក្សាទុក Google AI Studio API Key និងការកំណត់ Auto បត់បែន Model រួចរាល់ដោយជោគជ័យ!');
  });

  // Auto-save API Key on input
  el.inputGeminiApiKey.addEventListener('input', () => {
    const key = el.inputGeminiApiKey.value.trim();
    if (key) {
      GeminiService.setApiKey(key);
    }
  });

  // Test API Key button with Auto-Adaptive Model Detection
  el.btnTestGeminiApiKey.addEventListener('click', async () => {
    const key = el.inputGeminiApiKey.value.trim();
    if (!key) {
      alert('សូមបញ្ចូល API Key ជាមុនសិន!');
      return;
    }
    el.btnTestGeminiApiKey.disabled = true;
    el.btnTestGeminiApiKey.textContent = '⏳ កំពុងតេស្ត...';
    el.apiKeyTestStatus.style.display = 'block';
    el.apiKeyTestStatus.style.background = '#eff6ff';
    el.apiKeyTestStatus.style.color = '#1e40af';
    el.apiKeyTestStatus.textContent = 'កំពុងតភ្ជាប់ និងស្វែងរក Model សកម្មពី Google AI Studio...';

    try {
      const result = await GeminiService.testApiKey(key);
      GeminiService.setApiKey(key);
      
      // Update model dropdown with actual models detected
      populateModelDropdown(result.allModels, GeminiService.getSelectedModel());

      el.apiKeyTestStatus.style.background = '#f0fdf4';
      el.apiKeyTestStatus.style.color = '#166534';
      el.apiKeyTestStatus.style.border = '1px solid #86efac';
      el.apiKeyTestStatus.innerHTML = `
        ✅ <strong>ជោគជ័យ!</strong> API Key នេះត្រឹមត្រូវ និងដំណើរការល្អ ១០០% ជាមួយ Model <strong>${result.activeModel}</strong>!
        <div style="margin-top: 0.35rem; font-size: 0.8rem; color: #15803d; line-height: 1.4;">
          🔄 <strong>ប្រព័ន្ធ Auto បត់បែន Model សកម្ម៖</strong> បានរកឃើញ Model សរុបចំនួន <strong>${result.allModels.length}</strong> ដែលត្រៀមជាជំនួយការបម្រុងស្វ័យប្រវត្ត (Fallback)។
        </div>
      `;
      el.btnTestGeminiApiKey.disabled = false;
      el.btnTestGeminiApiKey.textContent = '🔍 តេស្តសាកល្បង';
    } catch (err) {
      el.apiKeyTestStatus.style.background = '#fef2f2';
      el.apiKeyTestStatus.style.color = '#991b1b';
      el.apiKeyTestStatus.style.border = '1px solid #fecaca';
      el.apiKeyTestStatus.innerHTML = '❌ <strong>បរាជ័យ៖</strong> ' + err.message;
      el.btnTestGeminiApiKey.disabled = false;
      el.btnTestGeminiApiKey.textContent = '🔍 តេស្តសាកល្បង';
    }
  });

  // Record Button Click
  el.btnRecordToggle.addEventListener('click', () => {
    if (speechEngine.isRecording || speechEngine.isPaused) {
      speechEngine.stop();
    } else {
      speechEngine.start();
    }
  });

  // Pause Button Click
  el.btnPauseToggle.addEventListener('click', () => {
    if (speechEngine.isPaused) {
      speechEngine.resume();
    } else {
      speechEngine.pause();
    }
  });

  // Language Change
  el.selLanguage.addEventListener('change', (e) => {
    speechEngine.setLanguage(e.target.value);
  });

  // Speaker Select Change
  el.selSpeaker.addEventListener('change', (e) => {
    state.currentSpeaker = e.target.value;
    speechEngine.setSpeaker(e.target.value);
  });

  // Add New Speaker
  el.btnAddSpeaker.addEventListener('click', () => {
    const name = prompt('បញ្ចូលឈ្មោះ ឬតួនាទីអ្នកនិយាយថ្មី (ឧ. លោកប្រធាននាយកដ្ឋាន...)៖');
    if (name && name.trim()) {
      const clean = name.trim();
      if (!state.speakers.includes(clean)) {
        state.speakers.push(clean);
        updateSpeakerDropdown();
        el.selSpeaker.value = clean;
        state.currentSpeaker = clean;
        speechEngine.setSpeaker(clean);
      }
    }
  });

  function updateSpeakerDropdown() {
    el.selSpeaker.innerHTML = '';
    state.speakers.forEach(spk => {
      const opt = document.createElement('option');
      opt.value = spk;
      opt.textContent = spk;
      el.selSpeaker.appendChild(opt);
    });
  }

  // Quick Notes input
  el.txtQuickNotes.addEventListener('input', (e) => {
    state.currentMeeting.quickNotes = e.target.value;
  });

  // Tabs Navigation
  const tabPairs = [
    { btn: el.tabBtnRecord, pane: el.tabPaneRecord },
    { btn: el.tabBtnUpload, pane: el.tabPaneUpload },
    { btn: el.tabBtnMeta, pane: el.tabPaneMeta },
    { btn: el.tabBtnHistory, pane: el.tabPaneHistory }
  ];

  tabPairs.forEach(pair => {
    pair.btn.addEventListener('click', () => {
      tabPairs.forEach(p => {
        p.btn.classList.remove('active');
        p.pane.style.display = 'none';
      });
      pair.btn.classList.add('active');
      pair.pane.style.display = 'block';
      if (pair.btn === el.tabBtnHistory) {
        loadHistoryMeetings();
      }
    });
  });

  // Audio Upload Handling
  el.uploadZone.addEventListener('click', () => el.audioFileInput.click());
  el.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.uploadZone.style.borderColor = '#0284c7';
    el.uploadZone.style.background = '#f0f9ff';
  });
  el.uploadZone.addEventListener('dragleave', () => {
    el.uploadZone.style.borderColor = '#93c5fd';
    el.uploadZone.style.background = '#f8fafc';
  });
  el.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.uploadZone.style.borderColor = '#93c5fd';
    el.uploadZone.style.background = '#f8fafc';
    if (e.dataTransfer.files.length > 0) {
      handleAudioFileSelected(e.dataTransfer.files[0]);
    }
  });
  el.audioFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleAudioFileSelected(e.target.files[0]);
    }
  });

  function handleAudioFileSelected(file) {
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.amr')) {
      alert('⚠️ ឯកសារប្រភេទ .amr មិនត្រូវបានគាំទ្រដោយ Google AI Studio (Gemini) ទេ។\n\n💡 ដំណោះស្រាយងាយៗ៖\n១. សូមចូលទៅកាន់កម្មវិធី Voice Recorder ក្នុងទូរស័ព្ទដៃ -> Settings (ការកំណត់) -> Recording format -> ជ្រើសរើសយក "M4A" ឬ "High Quality"\n២. ឬថតជាសារសម្លេងក្នុង Telegram / WhatsApp រួច Save ជាឯកសារ M4A / MP3\n៣. បន្ទាប់មកជ្រើសរើស Upload ឯកសារ M4A/MP3 នោះចូលប្រព័ន្ធម្តងទៀត។');
      el.audioFileInput.value = '';
      el.selectedFileName.textContent = '';
      el.audioPlayerContainer.style.display = 'none';
      state.selectedAudioFile = null;
      return;
    }

    state.selectedAudioFile = file;
    el.selectedFileName.textContent = `ឯកសារដែលបានជ្រើស៖ ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;

    const objectUrl = URL.createObjectURL(file);
    el.audioElement.src = objectUrl;
    el.audioPlayerContainer.style.display = 'block';
  }

  // Transcribe Live Recorded Audio with Google AI Studio
  el.btnTranscribeLiveRecordedAudio.addEventListener('click', async () => {
    if (!state.lastRecordedAudioBlob) {
      alert('មិនទាន់មានឯកសារសម្លេងដែលបានថតនៅឡើយទេ!');
      return;
    }

    if (!GeminiService.hasApiKey()) {
      alert('សូមបញ្ចូល Google AI Studio API Key ជាមុនសិន ដើម្បីឱ្យប្រព័ន្ធដំណើរការ!');
      el.btnOpenGeminiModal.click();
      return;
    }

    try {
      el.btnTranscribeLiveRecordedAudio.disabled = true;
      el.btnTranscribeLiveRecordedAudio.textContent = '⏳ កំពុងបំប្លែងសម្លេង...';

      const audioFile = new File([state.lastRecordedAudioBlob], 'live-recorded.webm', { type: 'audio/webm' });
      const result = await GeminiService.transcribeAudioWithGemini(
        audioFile,
        (progressMessage) => {
          el.btnTranscribeLiveRecordedAudio.textContent = progressMessage;
        }
      );

      // Populate Transcript
      if (result.transcript && Array.isArray(result.transcript)) {
        state.currentMeeting.transcript = result.transcript;
        renderTranscriptList();
      }

      // Populate Metadata
      if (result.title) state.currentMeeting.title = result.title;
      if (result.chairperson) state.currentMeeting.chairperson = result.chairperson;
      if (result.attendees) state.currentMeeting.attendees = result.attendees;
      if (result.agenda) state.currentMeeting.agenda = result.agenda;
      if (result.proceedingsSummary) state.currentMeeting.quickNotes = result.proceedingsSummary;
      if (result.decisions) state.currentMeeting.decisions = result.decisions;
      if (result.actionItems && Array.isArray(result.actionItems)) {
        state.currentMeeting.actionItems = result.actionItems;
      }

      syncStateToForm();
      el.documentSheet.innerHTML = MinutesGenerator.generateHTML(state.currentMeeting);
      switchToMobileView('col-minutes');

      el.btnTranscribeLiveRecordedAudio.disabled = false;
      el.btnTranscribeLiveRecordedAudio.textContent = '✨ បំប្លែងសម្លេងនេះជាមួយ Google AI Studio';

      alert(`🎉 ជោគជ័យ! Google AI Studio [${result.usedModel || 'gemini-3.8-flash'}] បានបំប្លែងសម្លេងជាអក្សរ និងរៀបចំកំណត់ហេតុរដ្ឋបាលជូនរួចរាល់!`);
    } catch (err) {
      console.error(err);
      el.btnTranscribeLiveRecordedAudio.disabled = false;
      el.btnTranscribeLiveRecordedAudio.textContent = '✨ បំប្លែងសម្លេងនេះជាមួយ Google AI Studio';
      alert('មានបញ្ហាក្នុងការបំប្លែងសម្លេងជាមួយ Google AI Studio:\n' + err.message);
    }
  });

  // Transcribe with Google AI Studio (Gemini) Action
  el.btnTranscribeWithGemini.addEventListener('click', async () => {
    if (!state.selectedAudioFile) {
      alert('សូមជ្រើសរើស ឬទម្លាក់ឯកសារសម្លេងចូលជាមុនសិន!');
      el.audioFileInput.click();
      return;
    }

    if (!GeminiService.hasApiKey()) {
      alert('សូមបញ្ចូល Google AI Studio API Key ជាមុនសិន ដើម្បីឱ្យប្រព័ន្ធដំណើរការ!');
      el.btnOpenGeminiModal.click();
      return;
    }

    try {
      el.btnTranscribeWithGemini.disabled = true;
      el.aiProgressBox.style.display = 'block';

      const result = await GeminiService.transcribeAudioWithGemini(
        state.selectedAudioFile,
        (progressMessage) => {
          el.aiProgressText.textContent = progressMessage;
        }
      );

      // Populate Transcript
      if (result.transcript && Array.isArray(result.transcript)) {
        state.currentMeeting.transcript = result.transcript;
        renderTranscriptList();
      }

      // Populate Metadata
      if (result.title) state.currentMeeting.title = result.title;
      if (result.chairperson) state.currentMeeting.chairperson = result.chairperson;
      if (result.attendees) state.currentMeeting.attendees = result.attendees;
      if (result.agenda) state.currentMeeting.agenda = result.agenda;
      if (result.proceedingsSummary) state.currentMeeting.quickNotes = result.proceedingsSummary;
      if (result.decisions) state.currentMeeting.decisions = result.decisions;
      if (result.actionItems && Array.isArray(result.actionItems)) {
        state.currentMeeting.actionItems = result.actionItems;
      }

      syncStateToForm();
      el.documentSheet.innerHTML = MinutesGenerator.generateHTML(state.currentMeeting);
      switchToMobileView('col-minutes');

      el.aiProgressBox.style.display = 'none';
      el.btnTranscribeWithGemini.disabled = false;

      alert(`🎉 ជោគជ័យ! Google AI Studio [${result.usedModel || 'gemini-3.8-flash'}] បានបំប្លែងសម្លេងជាអក្សរ និងរៀបចំកំណត់ហេតុរដ្ឋបាលជូនរួចរាល់!`);
    } catch (err) {
      console.error(err);
      el.aiProgressBox.style.display = 'none';
      el.btnTranscribeWithGemini.disabled = false;
      alert('មានបញ្ហាក្នុងការបំប្លែងសម្លេងជាមួយ Google AI Studio:\n' + err.message);
    }
  });

  // Metadata Form Binding
  function syncFormToState() {
    state.currentMeeting.ministry = el.inputMinistry.value;
    state.currentMeeting.department = el.inputDept.value;
    state.currentMeeting.title = el.inputTitle.value;
    state.currentMeeting.date = el.inputDate.value;
    state.currentMeeting.time = el.inputTime.value;
    state.currentMeeting.location = el.inputLocation.value;
    state.currentMeeting.chairperson = el.inputChairperson.value;
    state.currentMeeting.attendees = el.inputAttendees.value;
    state.currentMeeting.recorder = el.inputRecorder.value;
    state.currentMeeting.agenda = el.inputAgenda.value;
    state.currentMeeting.decisions = el.inputDecisions.value;
  }

  function syncStateToForm() {
    el.inputMinistry.value = state.currentMeeting.ministry || '';
    el.inputDept.value = state.currentMeeting.department || '';
    el.inputTitle.value = state.currentMeeting.title || '';
    el.inputDate.value = state.currentMeeting.date || '';
    el.inputTime.value = state.currentMeeting.time || '';
    el.inputLocation.value = state.currentMeeting.location || '';
    el.inputChairperson.value = state.currentMeeting.chairperson || '';
    el.inputAttendees.value = state.currentMeeting.attendees || '';
    el.inputRecorder.value = state.currentMeeting.recorder || '';
    el.inputAgenda.value = state.currentMeeting.agenda || '';
    el.inputDecisions.value = state.currentMeeting.decisions || '';
    el.txtQuickNotes.value = state.currentMeeting.quickNotes || '';
  }

  [el.inputMinistry, el.inputDept, el.inputTitle, el.inputDate, el.inputTime,
   el.inputLocation, el.inputChairperson, el.inputAttendees, el.inputRecorder,
   el.inputAgenda, el.inputDecisions].forEach(input => {
    input.addEventListener('input', syncFormToState);
  });

  // Transcript Management
  function addTranscriptItem(item) {
    state.currentMeeting.transcript.push(item);
    renderTranscriptList();
  }

  function renderTranscriptList() {
    el.transcriptList.innerHTML = '';
    const count = state.currentMeeting.transcript.length;
    el.transcriptCountBadge.textContent = `${count} ឃ្លា`;
    if (el.mobileTranscriptBadge) {
      el.mobileTranscriptBadge.textContent = count;
    }

    if (state.currentMeeting.transcript.length === 0) {
      el.transcriptList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #94a3b8;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎙️</div>
          <p>មិនទាន់មានការនិយាយនៅឡើយទេ។</p>
          <p style="font-size: 0.8rem; margin-top: 0.35rem;">
            លោកអ្នកអាចថតផ្ទាល់ ឬប្រើមុខងារ <strong>«ផ្ទុកឯកសារ»</strong> ដើម្បីឱ្យ <strong>Google AI Studio</strong> បំប្លែងសម្លេងជាអក្សរដោយស្វ័យប្រវត្តិ។
          </p>
        </div>
      `;
      return;
    }

    state.currentMeeting.transcript.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'transcript-item';

      const meta = document.createElement('div');
      meta.className = 'transcript-meta';

      const spkTag = document.createElement('span');
      spkTag.className = 'speaker-tag speaker-1';
      spkTag.innerHTML = `👤 ${item.speaker}`;
      spkTag.title = 'ចុចដើម្បីប្តូរឈ្មោះអ្នកនិយាយទាំងអស់';
      spkTag.addEventListener('click', () => openSpeakerModal(item.speaker));

      const timeTag = document.createElement('span');
      timeTag.className = 'timestamp-badge';
      timeTag.textContent = `⏱ ${item.timestamp}`;

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-secondary btn-sm';
      btnDelete.innerHTML = '🗑';
      btnDelete.title = 'លុបឃ្លានេះ';
      btnDelete.style.padding = '0.1rem 0.4rem';
      btnDelete.addEventListener('click', () => {
        state.currentMeeting.transcript.splice(index, 1);
        renderTranscriptList();
      });

      const rightBox = document.createElement('div');
      rightBox.style.display = 'flex';
      rightBox.style.alignItems = 'center';
      rightBox.style.gap = '0.5rem';
      rightBox.appendChild(timeTag);
      rightBox.appendChild(btnDelete);

      meta.appendChild(spkTag);
      meta.appendChild(rightBox);

      const content = document.createElement('div');
      content.className = 'transcript-content';
      content.contentEditable = 'true';
      content.textContent = item.text;
      content.addEventListener('blur', () => {
        state.currentMeeting.transcript[index].text = content.textContent.trim();
      });

      card.appendChild(meta);
      card.appendChild(content);
      el.transcriptList.appendChild(card);
    });

    el.transcriptList.scrollTop = el.transcriptList.scrollHeight;
  }

  el.btnClearTranscript.addEventListener('click', () => {
    if (confirm('តើអ្នកពិតជាចង់លុបអត្ថបទចម្លងទាំងអស់ក្នុងកិច្ចប្រជុំនេះមែនទេ?')) {
      state.currentMeeting.transcript = [];
      renderTranscriptList();
    }
  });

  // Speaker Rename Modal
  let speakerToRename = '';
  function openSpeakerModal(oldName) {
    speakerToRename = oldName;
    el.inputOldSpeaker.value = oldName;
    el.inputNewSpeaker.value = oldName;
    el.modalSpeaker.classList.add('open');
    el.inputNewSpeaker.focus();
    el.inputNewSpeaker.select();
  }

  el.btnCancelSpeakerModal.addEventListener('click', () => {
    el.modalSpeaker.classList.remove('open');
  });

  el.btnConfirmSpeakerRename.addEventListener('click', () => {
    const newName = el.inputNewSpeaker.value.trim();
    if (newName && newName !== speakerToRename) {
      state.currentMeeting.transcript.forEach(item => {
        if (item.speaker === speakerToRename) {
          item.speaker = newName;
        }
      });
      const idx = state.speakers.indexOf(speakerToRename);
      if (idx >= 0) state.speakers[idx] = newName;
      if (state.currentSpeaker === speakerToRename) {
        state.currentSpeaker = newName;
        speechEngine.setSpeaker(newName);
      }
      updateSpeakerDropdown();
      renderTranscriptList();
    }
    el.modalSpeaker.classList.remove('open');
  });

  // Generate Official Minutes
  el.btnGenerateMinutes.addEventListener('click', () => {
    syncFormToState();
    const html = MinutesGenerator.generateHTML(state.currentMeeting);
    el.documentSheet.innerHTML = html;
    switchToMobileView('col-minutes');
  });

  // Export DOCX (Client-side standalone)
  el.btnExportDocx.addEventListener('click', () => {
    syncFormToState();
    DocumentExporter.exportToDocx(state.currentMeeting);
  });

  // Print PDF
  el.btnPrintPDF.addEventListener('click', () => {
    DocumentExporter.printToPDF();
  });

  // Copy Minutes
  el.btnCopyMinutes.addEventListener('click', () => {
    DocumentExporter.copyMinutesToClipboard('documentSheet');
  });

  // Download Backup JSON
  el.btnDownloadBackup.addEventListener('click', () => {
    syncFormToState();
    DocumentExporter.downloadJSON(state.currentMeeting);
  });

  // Save Meeting to LocalStorage & Server fallback
  el.btnSaveMeeting.addEventListener('click', () => {
    syncFormToState();

    // Always save in LocalStorage (works on GitHub Pages / Client-side with zero server!)
    try {
      const savedList = JSON.parse(localStorage.getItem('brachum_meetings') || '[]');
      const index = savedList.findIndex(m => m.id === state.currentMeeting.id);
      if (index >= 0) {
        savedList[index] = state.currentMeeting;
      } else {
        savedList.unshift(state.currentMeeting);
      }
      localStorage.setItem('brachum_meetings', JSON.stringify(savedList));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // Try server if available
    fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.currentMeeting)
    })
    .catch(() => {});

    alert('បានរក្សាទុកកិច្ចប្រជុំដោយជោគជ័យ!');
  });

  // New Meeting
  el.btnNewMeeting.addEventListener('click', () => {
    if (confirm('តើអ្នកចង់បង្កើតកិច្ចប្រជុំថ្មីមែនទេ? (សូមប្រាកដថាបានរក្សាទុកកិច្ចប្រជុំបច្ចុប្បន្នរួចរាល់)')) {
      state.currentMeeting = {
        id: 'mtg_' + Date.now(),
        title: 'កំណត់ហេតុនៃកិច្ចប្រជុំ',
        ministry: 'ក្រសួងមហាផ្ទៃ',
        department: 'អគ្គនាយកដ្ឋានរដ្ឋបាល',
        date: new Date().toLocaleDateString('km-KH'),
        time: new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }),
        location: 'សាលប្រជុំក្រសួងមហាផ្ទៃ',
        chairperson: 'ឯកឧត្តមប្រធានអង្គប្រជុំ',
        attendees: '',
        recorder: 'មន្ត្រីកត់ត្រាកំណត់ហេតុ',
        agenda: '',
        quickNotes: '',
        transcript: [],
        decisions: '',
        actionItems: []
      };
      speechEngine.resetTimer();
      state.selectedAudioFile = null;
      el.selectedFileName.textContent = '';
      el.audioPlayerContainer.style.display = 'none';
      syncStateToForm();
      renderTranscriptList();
      el.documentSheet.innerHTML = MinutesGenerator.generateHTML(state.currentMeeting);
    }
  });

  // Load History Meetings from LocalStorage
  function loadHistoryMeetings() {
    let meetings = [];
    try {
      meetings = JSON.parse(localStorage.getItem('brachum_meetings') || '[]');
    } catch (e) {
      meetings = [];
    }

    if (meetings.length > 0) {
      renderHistoryList(meetings);
    } else {
      // Try server if available
      fetch('/api/meetings')
        .then(res => res.json())
        .then(srvMeetings => renderHistoryList(srvMeetings))
        .catch(() => {
          el.historyListContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 1.5rem;">មិនទាន់មានកិច្ចប្រជុំដែលបានរក្សាទុកនៅឡើយទេ។</p>';
        });
    }
  }

  function renderHistoryList(meetings) {
    el.historyListContainer.innerHTML = '';
    if (!meetings || meetings.length === 0) {
      el.historyListContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #94a3b8;">
          <p>មិនទាន់មានកិច្ចប្រជុំដែលបានរក្សាទុកនៅឡើយទេ។</p>
        </div>
      `;
      return;
    }

    meetings.forEach(m => {
      const card = document.createElement('div');
      card.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;';
      card.innerHTML = `
        <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 0.2rem;">${m.title || 'កិច្ចប្រជុំគ្មានចំណងជើង'}</div>
        <div style="font-size: 0.78rem; color: #64748b; display: flex; justify-content: space-between;">
          <span>📅 ${m.date || 'N/A'}</span>
          <span>📝 ${m.transcript ? m.transcript.length : (m.transcriptCount || 0)} ឃ្លា</span>
        </div>
      `;
      card.addEventListener('click', () => {
        state.currentMeeting = m;
        syncStateToForm();
        renderTranscriptList();
        el.documentSheet.innerHTML = MinutesGenerator.generateHTML(state.currentMeeting);
        el.tabBtnRecord.click();
        alert(`បានបើកកិច្ចប្រជុំ «${m.title}» រួចរាល់!`);
      });
      el.historyListContainer.appendChild(card);
    });
  }

  // Initialize Mobile & Tablet Navigation View Switcher
  function initMobileNav() {
    if (!el.mobileViewNav) return;
    const navButtons = el.mobileViewNav.querySelectorAll('.mobile-nav-btn');
    const panels = {
      'col-controls': document.getElementById('panelControls'),
      'col-transcript': document.getElementById('panelTranscript'),
      'col-minutes': document.getElementById('panelMinutes')
    };

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        Object.keys(panels).forEach(key => {
          const panel = panels[key];
          if (!panel) return;
          if (key === target) {
            panel.classList.add('mobile-active');
          } else {
            panel.classList.remove('mobile-active');
          }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function switchToMobileView(viewKey) {
    if (!el.mobileViewNav || window.innerWidth >= 1024) return;
    const btn = el.mobileViewNav.querySelector(`[data-target="${viewKey}"]`);
    if (btn) btn.click();
  }

  // Initial Setup
  initMobileNav();
  updateSpeakerDropdown();
  syncStateToForm();
  renderTranscriptList();
  el.documentSheet.innerHTML = MinutesGenerator.generateHTML(state.currentMeeting);
});
