import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  RotateCcw,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Square,
  Camera,
  Image as ImageIcon,
  Download,
  X,
  RefreshCw,
  ZoomIn,
  SwitchCamera,
  Wand2,
  Paperclip
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { aiApi } from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { speakModulatedTicket, stopModulatedSpeech, getFemaleVoice } from '../utils/voiceModulator';

export default function VoiceAssistant({ selectedLang, setSelectedLang }) {
  const { user } = useAuth();
  // Voice State: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'
  const [voiceState, setVoiceState] = useState('IDLE');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [lastCreatedTicket, setLastCreatedTicket] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Wake Word Engine state ("Hey Vaani")
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [wakeTriggered, setWakeTriggered] = useState(false);
  const wakeRecognitionRef = useRef(null);
  const isStartingListeningRef = useRef(false);
  const wakeRestartTimerRef = useRef(null);

  // Multimodal state: Attached image / Media
  const [attachedImage, setAttachedImage] = useState(null); // { dataUrl, name, type }
  const [isCamOpen, setIsCamOpen] = useState(false);
  const [camFacingMode, setCamFacingMode] = useState('environment'); // 'user' or 'environment'
  const [lightboxImage, setLightboxImage] = useState(null); // URL or dataUrl for full-screen preview

  // Audio & Speech references
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const accumulatedTextRef = useRef('');
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  // Camera references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const camStreamRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, voiceState, attachedImage]);

  // Clean up timers & audio & camera on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      stopCameraStream();
      stopModulatedSpeech();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current);
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.onend = null;
          wakeRecognitionRef.current.abort();
        } catch (e) {}
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // ------------------------------------------------------------
  // "Hey Vaani" Standby Wake Word Listener
  // Requirement: Wake word "hey vaani" -> Greeting: "hello 'user name' how can I help you"
  // ------------------------------------------------------------
  const triggerWakeGreeting = (immediateCommand = '') => {
    isStartingListeningRef.current = true;
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.onend = null;
        wakeRecognitionRef.current.abort();
      } catch (e) {}
      wakeRecognitionRef.current = null;
    }
    if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current);

    setWakeTriggered(true);
    let greetingText = "Yes, I'm listening.";
    let greetingLang = 'en-US';

    if (selectedLang === 'hi-IN') {
      greetingText = "हाँ, मैं सुन रही हूँ।";
      greetingLang = 'hi-IN';
    } else if (selectedLang === 'bn-IN') {
      greetingText = "হ্যাঁ, আমি শুনছি।";
      greetingLang = 'bn-IN';
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setVoiceState('SPEAKING');
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(greetingText);
      utterance.lang = greetingLang;
      utterance.rate = 0.98;
      utterance.pitch = 1.14;

      const voice = getFemaleVoice(greetingLang);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        setIsSpeaking(false);
        setWakeTriggered(false);
        if (immediateCommand && immediateCommand.length > 2) {
          isStartingListeningRef.current = false;
          processSpeechInput(immediateCommand);
        } else {
          startListening();
        }
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setWakeTriggered(false);
        startListening();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setWakeTriggered(false);
        startListening();
      }, 700);
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !wakeWordEnabled || voiceState !== 'IDLE' || isSpeaking || isStartingListeningRef.current) {
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.onend = null;
          wakeRecognitionRef.current.abort();
        } catch (e) {}
        wakeRecognitionRef.current = null;
      }
      return;
    }

    let isSubscribed = true;
    let wakeRec = null;

    const startWakeRec = () => {
      if (!isSubscribed || voiceState !== 'IDLE' || isSpeaking || isStartingListeningRef.current) return;
      try {
        wakeRec = new SpeechRecognition();
        wakeRec.continuous = true;
        wakeRec.interimResults = true;
        wakeRec.lang = selectedLang || 'en-IN';

        wakeRec.onresult = (event) => {
          if (!isSubscribed || isStartingListeningRef.current) return;
          let transcript = '';
          for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript.toLowerCase() + ' ';
          }

          const wakeRegex = /(?:hey|hay|he|hi|hello|ok|okay)?\s*(?:vaani|vani|wani|বাণী|वाणी|वानी|बानी)/i;
          if (wakeRegex.test(transcript)) {
            console.log('[WakeWord] Wake word detected in background:', transcript);
            try {
              wakeRec.onend = null;
              wakeRec.abort();
            } catch (e) {}
            wakeRecognitionRef.current = null;

            const matchIndex = transcript.search(wakeRegex);
            const matchedPhrase = transcript.match(wakeRegex)[0];
            const remainingText = transcript.slice(matchIndex + matchedPhrase.length).trim();

            triggerWakeGreeting(remainingText);
          }
        };

        wakeRec.onerror = (e) => {
          if (e.error === 'not-allowed') {
            console.warn('[WakeWord] Microphone permission denied for background wake word listener.');
          }
        };

        wakeRec.onend = () => {
          if (isSubscribed && wakeWordEnabled && voiceState === 'IDLE' && !isSpeaking && !isStartingListeningRef.current) {
            wakeRestartTimerRef.current = setTimeout(() => {
              if (isSubscribed && voiceState === 'IDLE' && !isSpeaking && !isStartingListeningRef.current) {
                try {
                  startWakeRec();
                } catch (e) {}
              }
            }, 600);
          }
        };

        wakeRec.start();
        wakeRecognitionRef.current = wakeRec;
      } catch (err) {
        console.warn('Wake word standby listener failed to start:', err);
      }
    };

    const initTimer = setTimeout(startWakeRec, 350);

    return () => {
      isSubscribed = false;
      clearTimeout(initTimer);
      if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current);
      if (wakeRec) {
        try {
          wakeRec.onend = null;
          wakeRec.abort();
        } catch (e) {}
      }
    };
  }, [wakeWordEnabled, voiceState, isSpeaking, selectedLang]);

  const cleanupAudio = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // ------------------------------------------------------------
  // Live Camera Functions
  // ------------------------------------------------------------
  const startCamera = async (mode = camFacingMode) => {
    stopCameraStream();
    setErrorMessage(null);
    setIsCamOpen(true);

    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      // Fallback to basic video without facingMode constraint
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        camStreamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
      } catch (fbErr) {
        setErrorMessage('Could not access camera. Please allow camera permissions in your browser.');
        setIsCamOpen(false);
      }
    }
  };

  const stopCameraStream = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
  };

  const closeCamera = () => {
    stopCameraStream();
    setIsCamOpen(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = camFacingMode === 'user' ? 'environment' : 'user';
    setCamFacingMode(nextMode);
    startCamera(nextMode);
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setAttachedImage({
      dataUrl,
      name: `live-cam-${Date.now().toString().slice(-4)}.jpg`,
      type: 'image/jpeg'
    });

    closeCamera();
  };

  const captureAndAskNow = (defaultPrompt = "What is shown in this camera view? Please analyze it.") => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    closeCamera();
    processSpeechInput(defaultPrompt, dataUrl);
  };

  // ------------------------------------------------------------
  // Media / File Upload Functions
  // ------------------------------------------------------------
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WEBP, GIF).');
      return;
    }

    // Limit to 8MB
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Image file is too large. Please select an image under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage({
        dataUrl: event.target.result,
        name: file.name,
        type: file.type
      });
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
  };

  // ------------------------------------------------------------
  // Speech Recognition & AudioContext VAD
  // ------------------------------------------------------------
  const startListening = async () => {
    isStartingListeningRef.current = true;
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.onend = null;
        wakeRecognitionRef.current.abort();
      } catch (e) {}
      wakeRecognitionRef.current = null;
    }
    if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current);
    cleanupAudio();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    setLiveTranscript('');
    accumulatedTextRef.current = '';
    setErrorMessage(null);
    setVoiceState('LISTENING');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge, or type in the box below.');
      setVoiceState('IDLE');
      isStartingListeningRef.current = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const pcmData = new Uint8Array(analyser.frequencyBinCount);
      let lastAudioUpdate = 0;
      const updateVolume = (timestamp) => {
        if (!analyserRef.current) return;
        // Throttle audio state updates to max 10 FPS (100ms) to eliminate React rendering freezes
        if (!lastAudioUpdate || timestamp - lastAudioUpdate >= 100) {
          lastAudioUpdate = timestamp;
          analyserRef.current.getByteFrequencyData(pcmData);
          let sum = 0;
          for (let i = 0; i < pcmData.length; i++) sum += pcmData[i];
          const avg = sum / pcmData.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        }
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      animFrameRef.current = requestAnimationFrame(updateVolume);
    } catch (err) {
      console.warn('Microphone stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access denied. Please allow microphone permissions in your browser URL bar.');
        setVoiceState('IDLE');
        isStartingListeningRef.current = false;
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang || 'hi-IN';

      recognition.onstart = () => {
        setVoiceState('LISTENING');
      };

      recognition.onresult = (event) => {
        let finalSpeech = '';
        let interimSpeech = '';

        // Iterate through all results to retain full multi-sentence utterance without dropping words
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalSpeech += event.results[i][0].transcript + ' ';
          } else {
            interimSpeech += event.results[i][0].transcript;
          }
        }

        const currentSpeech = (finalSpeech + interimSpeech).trim();
        if (currentSpeech) {
          accumulatedTextRef.current = currentSpeech;
          setLiveTranscript(currentSpeech);

          // Reset silence timer: Auto-stops after 1.8 seconds of natural silence
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            console.log('[Voice VAD] Auto-stop triggered after silence detected.');
            stopListeningAndSubmit();
          }, 1800);
        }
      };

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access blocked. Please allow mic permissions in browser settings.');
          stopListening();
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (voiceState === 'LISTENING') {
          if (accumulatedTextRef.current.trim()) {
            stopListeningAndSubmit();
          } else {
            // Keep listening if session ended without speech
            setTimeout(() => {
              if (voiceState === 'LISTENING') {
                try { recognition.start(); } catch (e) {}
              }
            }, 300);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setErrorMessage(err.message);
      stopListening();
    }
  };

  const stopListening = () => {
    isStartingListeningRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    cleanupAudio();
    setVoiceState('IDLE');
  };

  const stopListeningAndSubmit = () => {
    isStartingListeningRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const speech = accumulatedTextRef.current.trim() || liveTranscript.trim();
    stopListening();
    if (speech) {
      processSpeechInput(speech);
    }
  };

  // ------------------------------------------------------------
  // Process Voice / Text / Image Input with Multimodal Backend
  // ------------------------------------------------------------
  const processSpeechInput = async (userInputText, imageOverride = null) => {
    const text = (userInputText || textInput || '').trim();
    const imagePayload = imageOverride || attachedImage?.dataUrl || null;

    if (!text && !imagePayload) return;

    setTextInput('');
    setLiveTranscript('');
    accumulatedTextRef.current = '';

    const effectiveText = text || 'Analyze this image and describe what you see.';

    // Append user message to thread
    const userMsg = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: effectiveText,
      image: imagePayload,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setVoiceState('THINKING');

    // Clear active attached image once sent
    setAttachedImage(null);

    try {
      const res = await aiApi.sendMessage({
        message: effectiveText,
        image: imagePayload,
        conversation_id: currentConversationId,
        language: selectedLang
      });

      if (res.data?.success) {
        const data = res.data;
        setCurrentConversationId(data.conversation_id);
        setAiData({
          intent: data.intent,
          category: data.category,
          priority: data.priority,
          entities: data.entities,
          missing_information: data.missing_information,
          next_action: data.next_action,
          source: data.source
        });

        // Add assistant reply to conversation thread
        const assistantMsg = {
          id: 'asst-' + Date.now(),
          role: 'assistant',
          content: data.reply,
          generated_image: data.generated_image || null,
          ticket: data.ticket || null,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);

        if (data.ticket) {
          setLastCreatedTicket(data.ticket);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });

          // Priority Voice Modulation for created ticket
          setVoiceState('SPEAKING');
          setIsSpeaking(true);
          speakModulatedTicket(data.ticket, selectedLang, {
            onEnd: () => {
              setVoiceState('IDLE');
              setIsSpeaking(false);
            },
            onError: () => {
              setVoiceState('IDLE');
              setIsSpeaking(false);
            }
          });
        } else {
          // Speak aloud standard assistant reply
          const cleanSpeakText = data.reply
            .replace(/```[\s\S]*?```/g, 'Code block omitted.')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[#*_~`]/g, '')
            .slice(0, 400);

          speakAloud(cleanSpeakText, selectedLang);
        }
      } else {
        throw new Error(res.data?.error || 'Failed to process request');
      }
    } catch (err) {
      console.error('AI Processing Error:', err);
      setErrorMessage(err.response?.data?.error || err.message || 'AI processing error. Please try again.');
      setIsSpeaking(false);
      isStartingListeningRef.current = false;
      setVoiceState('IDLE');
    }
  };

  // Text to Speech
  const speakAloud = (text, lang) => {
    if (!window.speechSynthesis) {
      setVoiceState('IDLE');
      return;
    }

    window.speechSynthesis.cancel();
    setVoiceState('SPEAKING');
    setIsSpeaking(true);

    const targetLang = lang || selectedLang || 'hi-IN';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.98; // Natural, calm feminine cadence
    utterance.pitch = 1.14; // Warm, natural feminine pitch

    const voice = getFemaleVoice(targetLang);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setIsSpeaking(false);
      setVoiceState('IDLE');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceState('IDLE');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setVoiceState('IDLE');
  };

  const handleQuickPrompt = (promptText, lang) => {
    if (lang) setSelectedLang(lang);
    setLiveTranscript(promptText);
    processSpeechInput(promptText);
  };

  const languages = [
    { code: 'hi-IN', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'en-IN', label: 'English', flag: '🇬🇧' },
    { code: 'bn-IN', label: 'বাংলা', flag: '🇧🇩' }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', minHeight: 'calc(100vh - 70px)' }}>
      {/* Hidden file input for media uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />
      {/* Hidden canvas for video snapshot capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header & Status Indicator */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
              Vaani<span style={{ color: '#38bdf8' }}>AI</span> Multimodal Assistant
            </h1>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
              GEMINI 3.1 VISION + IMAGE GEN
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            "Speak, attach images, stream live cam, or create AI artwork on demand."
          </p>
        </div>

        {/* Controls: Language Selection (Wake word operates silently in background) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Language Selection Pills */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-subtle)' }}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedLang === l.code ? '#6366f1' : 'transparent',
                  color: selectedLang === l.code ? '#ffffff' : 'var(--text-dim)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wake Word HUD Banner */}
      {wakeTriggered && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(6, 182, 212, 0.95))',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 0 35px rgba(6, 182, 212, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Sparkles size={20} color="#fff" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            "Hey Vaani" Detected! Saying: "Hello {user?.name ? user.name.split(' ')[0] : 'Friend'}, how can I help you?"
          </span>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {isCamOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '680px',
            background: '#0f172a',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 0 50px rgba(56, 189, 248, 0.25)'
          }}>
            {/* Viewfinder Header */}
            <div style={{
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.9)',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700 }}>
                <Camera size={18} />
                <span>LIVE WEBCAM / VISION INSPECTION</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={toggleCameraFacing}
                  title="Switch Camera (Front/Back)"
                  style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <SwitchCamera size={16} />
                </button>
                <button
                  onClick={closeCamera}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#f87171', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Video Viewport with HUD overlay */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Futuristic Crosshair Overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '180px',
                height: '180px',
                border: '2px dashed rgba(56, 189, 248, 0.5)',
                borderRadius: '16px',
                pointerEvents: 'none',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.2)'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '16px',
                background: 'rgba(0, 0, 0, 0.65)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#38bdf8'
              }}>
                Align object or problem inside the frame
              </div>
            </div>

            {/* Viewfinder Controls */}
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: '#0f172a'
            }}>
              <button
                onClick={captureSnapshot}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem' }}
              >
                <Camera size={18} /> Attach Snapshot
              </button>

              <button
                onClick={() => captureAndAskNow("What is this? Please inspect and diagnose any issues in detail.")}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={16} /> Snap & Inspect Now
              </button>

              <button
                onClick={closeCamera}
                className="btn-secondary"
                style={{ padding: '10px 16px', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Image Zoom */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Enlarged view"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '12px',
                boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <a
                href={lightboxImage}
                download="vaani-ai-image.jpg"
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Download size={15} /> Download Full Quality
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <X size={15} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Centerpiece Card */}
      <div className="glass-panel" style={{
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: '24px',
        marginBottom: '24px',
        border: voiceState === 'LISTENING' ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid var(--border-subtle)',
        boxShadow: voiceState === 'LISTENING' ? '0 0 40px rgba(6, 182, 212, 0.2)' : 'var(--shadow-sm)',
        transition: 'all 0.3s ease'
      }}>
        {/* State Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '30px',
          fontSize: '0.82rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '20px',
          background: voiceState === 'LISTENING' ? 'rgba(6, 182, 212, 0.15)' :
                      voiceState === 'THINKING' ? 'rgba(168, 85, 247, 0.15)' :
                      voiceState === 'SPEAKING' ? 'rgba(74, 222, 128, 0.15)' :
                      'rgba(255, 255, 255, 0.05)',
          color: voiceState === 'LISTENING' ? '#38bdf8' :
                 voiceState === 'THINKING' ? '#c084fc' :
                 voiceState === 'SPEAKING' ? '#4ade80' :
                 'var(--text-dim)',
          border: voiceState === 'LISTENING' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--border-subtle)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
            boxShadow: '0 0 8px currentColor',
            animation: voiceState !== 'IDLE' ? 'pulseCritical 1s infinite' : 'none'
          }} />
          {voiceState === 'LISTENING' ? 'Listening • Auto-stops when you pause' :
           voiceState === 'THINKING' ? 'Gemini AI is Reasoning...' :
           voiceState === 'SPEAKING' ? 'Speaking Response...' :
           'Voice & Multimodal Ready'}
        </div>

        {/* Central Reactive Microphone Orb */}
        <div style={{ position: 'relative', margin: '8px 0 16px 0' }}>
          {voiceState === 'LISTENING' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${120 + audioLevel * 0.9}px`,
              height: `${120 + audioLevel * 0.9}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(99, 102, 241, 0.05) 70%, transparent 100%)',
              transition: 'width 0.15s ease-out, height 0.15s ease-out',
              pointerEvents: 'none'
            }} />
          )}

          <button
            onClick={voiceState === 'LISTENING' ? stopListeningAndSubmit : voiceState === 'SPEAKING' ? stopSpeaking : startListening}
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: voiceState === 'LISTENING' ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' :
                          voiceState === 'SPEAKING' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                          voiceState === 'THINKING' ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' :
                          'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: voiceState === 'LISTENING' ? '0 0 40px rgba(6, 182, 212, 0.6)' :
                         voiceState === 'SPEAKING' ? '0 0 35px rgba(16, 185, 129, 0.5)' :
                         '0 0 30px rgba(99, 102, 241, 0.4)',
              transform: voiceState === 'LISTENING' ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              zIndex: 3
            }}
            title={voiceState === 'LISTENING' ? 'Click to submit speech' : voiceState === 'SPEAKING' ? 'Click to mute' : 'Click to start speaking'}
          >
            {voiceState === 'LISTENING' ? (
              <Square size={36} color="#ffffff" fill="#ffffff" />
            ) : voiceState === 'SPEAKING' ? (
              <Volume2 size={40} color="#ffffff" />
            ) : (
              <Mic size={44} color="#ffffff" />
            )}
          </button>
        </div>

        {/* Real-Time Live Audio Waveform Bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '36px', margin: '6px 0' }}>
          {[14, 28, 42, 22, 35, 18, 48, 30, 24, 40, 16, 32].map((baseH, idx) => {
            const dynamicH = voiceState === 'LISTENING'
              ? Math.max(6, Math.min(44, (baseH * (audioLevel + 20)) / 60))
              : voiceState === 'SPEAKING' ? Math.max(8, baseH * 0.7) : 6;
            return (
              <div
                key={idx}
                style={{
                  width: '4px',
                  height: `${dynamicH}px`,
                  borderRadius: '3px',
                  background: voiceState === 'LISTENING' ? 'linear-gradient(180deg, #38bdf8, #6366f1)' :
                              voiceState === 'SPEAKING' ? 'linear-gradient(180deg, #4ade80, #10b981)' :
                              'rgba(255, 255, 255, 0.15)',
                  transition: 'height 0.08s ease'
                }}
              />
            );
          })}
        </div>

        {/* Live Audio Transcript Display */}
        <div style={{ minHeight: '50px', width: '100%', maxWidth: '650px', textAlign: 'center', marginTop: '8px' }}>
          {liveTranscript ? (
            <p style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1.5,
              margin: 0
            }}>
              "{liveTranscript}"
              {voiceState === 'LISTENING' && <span style={{ color: '#38bdf8', animation: 'pulseCritical 0.8s infinite' }}> |</span>}
            </p>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.92rem', margin: 0 }}>
              {voiceState === 'LISTENING' ? 'Listening... Speak naturally.' : 'Tap mic to speak, or use camera / image buttons below.'}
            </p>
          )}
        </div>

        {/* Attached Image Preview Chip */}
        {attachedImage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '12px',
            padding: '8px 14px',
            marginTop: '14px',
            maxWidth: '420px'
          }}>
            <img
              src={attachedImage.dataUrl}
              alt="Attached preview"
              onClick={() => setLightboxImage(attachedImage.dataUrl)}
              style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                Image Attached for AI
              </div>
              <div style={{ fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {attachedImage.name}
              </div>
            </div>
            <button
              onClick={removeAttachedImage}
              title="Remove attached image"
              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Multimodal Quick Controls Toolbar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '16px'
        }}>
          <button
            onClick={() => startCamera('environment')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <Camera size={16} color="#38bdf8" />
            <span>Live Cam</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <Paperclip size={16} color="#a5b4fc" />
            <span>Upload Media</span>
          </button>

          <button
            onClick={() => handleQuickPrompt("Generate a photorealistic 3D image of a futuristic campus library with students and AI bots.", "en-IN")}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', borderColor: 'rgba(234, 179, 8, 0.3)' }}
          >
            <Wand2 size={16} color="#facc15" />
            <span>Generate Image</span>
          </button>

          {voiceState === 'LISTENING' && (
            <button
              onClick={stopListeningAndSubmit}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              Submit Speech Now
            </button>
          )}
        </div>
      </div>

      {/* Verified Ticket Alert Card (Shows when AI performs CREATE_TICKET) */}
      {lastCreatedTicket && (
        <div className="glass-panel" style={{
          padding: '20px 24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} color="#fff" />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  OFFICIAL SERVICE TICKET VERIFIED & REGISTERED
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
                  {lastCreatedTicket.ticket_number} — {lastCreatedTicket.title}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  Room: {lastCreatedTicket.room_number || 'Hostel'} • Category: {lastCreatedTicket.category} • Priority: <strong style={{ color: lastCreatedTicket.priority === 'Critical' ? '#f87171' : '#38bdf8' }}>{lastCreatedTicket.priority}</strong> • Assigned Host: <strong style={{ color: '#fcd34d' }}>Prof. Sharma (Chief Warden)</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setVoiceState('SPEAKING');
                  setIsSpeaking(true);
                  speakModulatedTicket(lastCreatedTicket, selectedLang, {
                    onEnd: () => {
                      setVoiceState('IDLE');
                      setIsSpeaking(false);
                    },
                    onError: () => {
                      setVoiceState('IDLE');
                      setIsSpeaking(false);
                    }
                  });
                }}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  cursor: 'pointer'
                }}
              >
                <Volume2 size={16} /> 🔊 Voice Modulate
              </button>

              <Link
                to={`/tickets/${lastCreatedTicket.id || lastCreatedTicket.ticket_number}`}
                className="btn-primary"
                style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                View Ticket Details <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Multi-Domain Demo Prompts */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            ⚡ Multimodal Prompts & Image Generation (1-Click Try)
          </span>
          <span style={{ fontSize: '0.72rem', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
            Vision • Voice • Generation
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
          <button
            onClick={() => handleQuickPrompt("Generate a photorealistic 3D image of a futuristic campus library with students and AI bots.", "en-IN")}
            style={{
              padding: '10px 14px',
              textAlign: 'left',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <div style={{ color: '#d97706', fontWeight: 700, fontSize: '0.72rem', marginBottom: '2px' }}>🎨 AI IMAGE GENERATION</div>
            "Generate an image of futuristic campus library."
          </button>

          <button
            onClick={() => handleQuickPrompt("Explain quantum computing in comprehensive detail with real-world examples in Hindi.", "hi-IN")}
            style={{
              padding: '10px 14px',
              textAlign: 'left',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <div style={{ color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.72rem', marginBottom: '2px' }}>💡 COMPLETE EXPLANATION</div>
            "Explain quantum computing in detail (Hindi)."
          </button>

          <button
            onClick={() => handleQuickPrompt("Mere hostel room 204 mein switchboard se spark aa raha hai aur fan band hai.", "hi-IN")}
            style={{
              padding: '10px 14px',
              textAlign: 'left',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.72rem', marginBottom: '2px' }}>⚡ CRITICAL SERVICE TICKET</div>
            "Room 204 switchboard spark & fan stopped."
          </button>

          <button
            onClick={() => handleQuickPrompt("Write a full Node.js Express middleware for rate limiting and explain how it works.", "en-IN")}
            style={{
              padding: '10px 14px',
              textAlign: 'left',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.72rem', marginBottom: '2px' }}>💻 CODING ARCHITECTURE</div>
            "Write a full Node.js rate-limiting middleware."
          </button>
        </div>
      </div>

      {/* Dialogue Chat Log & Multimodal Input Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#38bdf8" />
            <h3 style={{ fontSize: '0.98rem', margin: 0, color: '#e2e8f0' }}>Conversation Transcript & Visual Output</h3>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setCurrentConversationId(null);
                setAiData(null);
                setLastCreatedTicket(null);
                setAttachedImage(null);
                if (window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={12} /> Clear Chat
            </button>
          )}
        </div>

        {/* Scrollable chat messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
          {messages.length === 0 ? (
            <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
              <Sparkles size={32} color="#6366f1" style={{ marginBottom: '8px', opacity: 0.6 }} />
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>No messages yet</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>Tap the mic above, open live camera, upload an image, or ask any question.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: isUser ? '85%' : '95%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  {/* If user sent an image */}
                  {isUser && m.image && (
                    <div style={{ marginBottom: '6px' }}>
                      <img
                        src={m.image}
                        alt="User upload"
                        onClick={() => setLightboxImage(m.image)}
                        style={{
                          maxWidth: '220px',
                          maxHeight: '160px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isUser ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'rgba(255, 255, 255, 0.05)',
                    border: isUser ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}>
                    {isUser ? (
                      <div>{m.content}</div>
                    ) : (
                      <div className="markdown-content">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Generated Image Showcase Card (If assistant generated an image) */}
                  {!isUser && m.generated_image && (
                    <div style={{
                      marginTop: '12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(234, 179, 8, 0.35)',
                      borderRadius: '16px',
                      padding: '14px',
                      maxWidth: '520px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#facc15', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Wand2 size={13} /> AI Generated Visual
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>1024 × 1024 High-Res</span>
                      </div>

                      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxImage(m.generated_image.url)}>
                        <img
                          src={m.generated_image.url}
                          alt={m.generated_image.prompt}
                          loading="lazy"
                          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px', transition: 'transform 0.2s ease' }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(0, 0, 0, 0.65)',
                          borderRadius: '8px',
                          padding: '6px',
                          color: '#fff'
                        }}>
                          <ZoomIn size={16} />
                        </div>
                      </div>

                      <p style={{ margin: '10px 0 8px 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4, fontStyle: 'italic' }}>
                        "{m.generated_image.prompt}"
                      </p>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <a
                          href={m.generated_image.url}
                          download="generated-image.jpg"
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary"
                          style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Download size={13} /> Save Image
                        </a>
                        <button
                          onClick={() => setLightboxImage(m.generated_image.url)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Fullscreen
                        </button>
                      </div>
                    </div>
                  )}

                  {!isUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                      <button
                        onClick={() => speakAloud(m.content, selectedLang)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Volume2 size={13} /> Replay Audio
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.82rem', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} />
            <span style={{ flex: 1 }}>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Text Form & Attachment Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processSpeechInput();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}
        >
          {/* Camera Trigger */}
          <button
            type="button"
            onClick={() => startCamera('environment')}
            title="Open Live Camera"
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--primary-600)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Camera size={18} />
          </button>

          {/* File Upload Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image/Media"
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--primary-600)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={attachedImage ? "Ask a question about the attached image, or hit Send..." : "Type any question, complaint, or 'Generate an image of...'"}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '10px 16px' }}
            disabled={(!textInput.trim() && !attachedImage) || voiceState === 'THINKING'}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
