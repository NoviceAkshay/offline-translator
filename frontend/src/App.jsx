import React, { useState, useRef, useEffect } from 'react';
import './index.css';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
];

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [srcLang, setSrcLang] = useState('en');
  const [tgtLang, setTgtLang] = useState('fr');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Explicitly try to use a compatible mimeType
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = processAudio;

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscript('');
      setTranslation('');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Ensure you are on https or localhost.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    if (chunksRef.current.length === 0) return;
    setIsProcessing(true);

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'input.webm');
    formData.append('src_lang', srcLang);
    formData.append('tgt_lang', tgtLang);

    try {
      const response = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Server error");

      const data = await response.json();
      setTranscript(data.transcript);
      setTranslation(data.translation);

      if (data.audio_url) {
        const audio = new Audio(data.audio_url);
        audio.play();
      }
    } catch (error) {
      console.error(error);
      alert("Translation failed. Ensure backend is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text, lang) => {
    if (!text) return;

    // Optimistic UI feedback could go here

    const formData = new FormData();
    formData.append('text', text);
    formData.append('language', lang);

    try {
      const response = await fetch('http://localhost:8000/speak-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("TTS failed");

      const data = await response.json();
      if (data.audio_url) {
        new Audio(data.audio_url).play();
      }
    } catch (err) {
      console.error("TTS Error:", err);
      alert("Failed to generate speech. Ensure backend is running.");
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // Simple alert or toast could be added here. 
    // For now we assume user knows it worked or we add a small visual cue if needed.
  };

  return (
    <div className="app-container">
      <div className="glass-panel">
        <h1 className="title">Live Audio Translator</h1>

        <div className="controls">
          <select
            className="lang-select"
            value={srcLang}
            onChange={(e) => setSrcLang(e.target.value)}
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>

          <span style={{ alignSelf: 'center', fontSize: '1.5rem' }}>→</span>

          <select
            className="lang-select"
            value={tgtLang}
            onChange={(e) => setTgtLang(e.target.value)}
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem' }}>
          <button
            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <div className="icon">
              {isRecording ? '⏹' : '🎙'}
            </div>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>

        {isRecording && (
          <div className="visualizer">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
          </div>
        )}

        {isProcessing && <div style={{ textAlign: 'center', color: '#8b949e' }}>Processing...</div>}

        <div className="grid-layout">
          {/* Source Panel */}
          <div className="output-box">
            <div className="panel-header">
              <label className="output-label">Transcript ({srcLang})</label>
              <div className="panel-controls">
                <button
                  className="icon-btn"
                  title="Speak"
                  onClick={() => speakText(transcript, srcLang)}
                  disabled={!transcript}
                >
                  🔊
                </button>
                <button
                  className="icon-btn"
                  title="Copy"
                  onClick={() => copyToClipboard(transcript)}
                  disabled={!transcript}
                >
                  📋
                </button>
              </div>
            </div>
            <p className="output-text">{transcript || "Waiting for speech..."}</p>
          </div>

          {/* Translation Panel */}
          <div className="output-box" style={{ borderColor: 'var(--primary)' }}>
            <div className="panel-header">
              <label className="output-label">Translation ({tgtLang})</label>
              <div className="panel-controls">
                <button
                  className="icon-btn"
                  title="Speak"
                  onClick={() => speakText(translation, tgtLang)}
                  disabled={!translation}
                >
                  🔊
                </button>
                <button
                  className="icon-btn"
                  title="Copy"
                  onClick={() => copyToClipboard(translation)}
                  disabled={!translation}
                >
                  📋
                </button>
              </div>
            </div>
            <p className="output-text">{translation || "Waiting for result..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
