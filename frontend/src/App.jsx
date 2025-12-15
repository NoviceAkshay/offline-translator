import React, { useState, useRef, useEffect } from 'react';
import './index.css';
import { LANGUAGES } from './constants/languages';
import LanguageSelector from './components/LanguageSelector';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [srcLang, setSrcLang] = useState('en');
  const [tgtLang, setTgtLang] = useState('fr');
  const [theme, setTheme] = useState('dark');

  // Load theme from local storage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

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
  };

  const handleTranslateText = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch('http://localhost:8000/translate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          src_lang: srcLang,
          tgt_lang: tgtLang
        })
      });
      if (!response.ok) throw new Error("Translation failed");
      const data = await response.json();
      setTranslation(data.translation);
    } catch (err) {
      console.error(err);
      alert("Text Translation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <div className="glass-panel" style={{ position: 'relative' }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <h1 className="title">Live Audio Translator</h1>

        <div className="controls-container">
          <div className="language-group">
            <LanguageSelector
              languages={LANGUAGES}
              selectedCode={srcLang}
              onChange={setSrcLang}
            />
          </div>

          <button
            className="exchange-btn"
            title="Swap Languages"
            onClick={() => {
              const temp = srcLang;
              setSrcLang(tgtLang);
              setTgtLang(temp);
              setTranscript(translation);
              setTranslation(transcript);
            }}
            disabled={isProcessing}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 16V4M7 4L3 8M7 4L11 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="language-group">
            <LanguageSelector
              languages={LANGUAGES}
              selectedCode={tgtLang}
              onChange={setTgtLang}
            />
          </div>
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
            <textarea
              className="output-text editable-area"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type or paste text here..."
            />
          </div>

          {/* Center Action Button */}
          <div className="center-action">
            <button
              className="translate-action-btn"
              onClick={() => handleTranslateText()}
              disabled={isProcessing}
              title="Translate Input Text"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
