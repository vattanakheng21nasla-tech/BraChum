/**
 * Firebase Integration for BraChum
 * Project: brachum-663fa
 * Provides real-time Cloud Firestore persistence, authentication, and offline sync
 */

const firebaseConfig = {
  apiKey: "AIzaSyBXRwaehYtp2Bp6dHC5ph-9CBhFHBC1b2A",
  authDomain: "brachum-663fa.firebaseapp.com",
  projectId: "brachum-663fa",
  storageBucket: "brachum-663fa.firebasestorage.app",
  messagingSenderId: "608793545891",
  appId: "1:608793545891:web:1a0c37d5c8bf49a2a1c316",
  measurementId: "G-ZV6G3NP9V5"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(firebaseConfig);
        } else {
          this.app = firebase.app();
        }
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.isInitialized = true;

        // Enable offline persistence
        this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence: Multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence not supported by browser');
          }
        });

        console.log('🔥 Firebase Cloud Firestore successfully initialized for BraChum!');
      }
    } catch (e) {
      console.warn('Firebase initialization notice:', e);
    }
  }

  /**
   * Save a meeting to Cloud Firestore
   */
  async saveMeeting(meetingData) {
    const id = meetingData.id || `meeting_${Date.now()}`;
    const payload = {
      ...meetingData,
      id: id,
      updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) 
        ? firebase.firestore.FieldValue.serverTimestamp() 
        : new Date().toISOString()
    };
    if (!meetingData.createdAt) {
      payload.createdAt = (typeof firebase !== 'undefined' && firebase.firestore)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();
    }

    if (this.isInitialized && this.db) {
      await this.db.collection('meetings').doc(id).set(payload, { merge: true });
      console.log('✅ Meeting saved to Cloud Firestore:', id);
    }

    // Always keep local backup in localStorage
    this.saveMeetingToLocal(payload);
    return id;
  }

  /**
   * Listen to real-time meetings from Cloud Firestore
   */
  onMeetingsChange(callback) {
    if (this.isInitialized && this.db) {
      return this.db.collection('meetings')
        .onSnapshot(snapshot => {
          const meetings = [];
          snapshot.forEach(doc => {
            meetings.push({ id: doc.id, ...doc.data() });
          });
          // Sort by date or id descending
          meetings.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
          callback(meetings);
        }, err => {
          console.warn('Firestore listener notice:', err);
          callback(this.loadMeetingsFromLocal());
        });
    } else {
      callback(this.loadMeetingsFromLocal());
      return () => {};
    }
  }

  /**
   * Delete meeting from Firestore
   */
  async deleteMeeting(id) {
    if (this.isInitialized && this.db) {
      try {
        await this.db.collection('meetings').doc(id).delete();
      } catch (e) {
        console.warn('Firestore delete error:', e);
      }
    }
    let list = this.loadMeetingsFromLocal().filter(m => m.id !== id);
    localStorage.setItem('brachum_meetings', JSON.stringify(list));
  }

  /**
   * Local storage fallback
   */
  saveMeetingToLocal(meeting) {
    try {
      let list = this.loadMeetingsFromLocal();
      const idx = list.findIndex(m => m.id === meeting.id);
      if (idx >= 0) {
        list[idx] = meeting;
      } else {
        list.unshift(meeting);
      }
      localStorage.setItem('brachum_meetings', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  loadMeetingsFromLocal() {
    try {
      return JSON.parse(localStorage.getItem('brachum_meetings') || '[]');
    } catch (e) {
      return [];
    }
  }
}

window.FirebaseService = new FirebaseService();
window.firebaseConfig = firebaseConfig;
