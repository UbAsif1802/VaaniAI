/**
 * VAANI AI — Female Voice Modulator & Intelligent TTS Engine
 * Dynamically modulates speech synthesis pitch, rate, volume, and urgency tone
 * while consistently preserving a warm, calm, natural feminine persona.
 */

// Female voice name identifiers across Chrome, Windows, Edge, macOS, iOS, Android
const FEMALE_VOICE_KEYWORDS = [
  'female', 'woman', 'zira', 'jenny', 'sonia', 'neerja', 'swara', 'kalpana', 'heera',
  'samantha', 'karen', 'victoria', 'moira', 'tessa', 'fiona', 'tanisha', 'sweta',
  'priya', 'pooja', 'komal', 'leena', 'geeta', 'anjali', 'veena', 'raveena',
  'google uk english female', 'google us english', 'google हिन्दी', 'google বাংলা'
];

/**
 * Select the highest quality female voice available in the browser
 * @param {string} lang - Language code: 'hi-IN' | 'bn-IN' | 'en-IN' | 'en-US'
 * @returns {SpeechSynthesisVoice|null}
 */
export function getFemaleVoice(lang = 'hi-IN') {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const langPrefix = (lang || 'hi').toLowerCase().split('-')[0];
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));

  // 1. Look for explicit female match in target language
  const femaleLangVoice = langVoices.find(v => {
    const name = v.name.toLowerCase();
    return FEMALE_VOICE_KEYWORDS.some(kw => name.includes(kw));
  });
  if (femaleLangVoice) return femaleLangVoice;

  // 2. If target language voice exists, pick it (will be modulated with feminine pitch)
  if (langVoices.length > 0) {
    // Prefer India-localized voices
    const inVoice = langVoices.find(v => v.lang.includes('IN'));
    return inVoice || langVoices[0];
  }

  // 3. Fallback to English female voice
  const femaleEnVoice = voices.find(v => {
    const name = v.name.toLowerCase();
    return FEMALE_VOICE_KEYWORDS.some(kw => name.includes(kw));
  });
  if (femaleEnVoice) return femaleEnVoice;

  return voices[0] || null;
}

// Play subtle priority alert tone using Web Audio API for high/critical tickets
function playPriorityTone(priority) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (priority === 'Critical') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (priority === 'High') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (e) {
    // AudioContext may be restricted by browser autoplay policy
  }
}

/**
 * Speaks a service ticket with full voice modulation across all features.
 * Consistently preserves a warm, calm, natural feminine persona while dynamically
 * modulating pitch, rate, and volume according to ticket urgency.
 *
 * @param {Object} ticket - Service ticket object
 * @param {string} lang - Language code: 'en-IN' | 'hi-IN' | 'bn-IN'
 * @param {Object} callbacks - { onStart, onEnd, onError }
 */
export function speakModulatedTicket(ticket, lang = 'hi-IN', callbacks = {}) {
  if (!window.speechSynthesis || !ticket) {
    if (callbacks.onError) callbacks.onError('SpeechSynthesis API is not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel();

  const priority = ticket.priority || 'Medium';
  const category = ticket.category || 'General';
  const room = ticket.room_number ? `Room ${ticket.room_number}` : (ticket.location || 'Hostel Campus');
  const title = ticket.title || 'Service Request';
  const ticketNumber = ticket.ticket_number || '';

  // Subtle audio cue for high/critical tickets
  if (priority === 'Critical' || priority === 'High') {
    playPriorityTone(priority);
  }

  // Feminine Voice Modulation Parameters:
  // Critical: Focused, urgent feminine register (pitch 1.22, rate 1.05, volume 1.0)
  // High: Confident, attentive feminine tone (pitch 1.18, rate 1.02, volume 1.0)
  // Medium: Warm, pleasant conversational female tone (pitch 1.14, rate 0.98, volume 0.96)
  // Low: Calm, soft, leisurely female tone (pitch 1.10, rate 0.95, volume 0.92)
  let pitch = 1.14;
  let rate = 0.98;
  let volume = 0.96;

  switch (priority) {
    case 'Critical':
      pitch = 1.22;
      rate = 1.05;
      volume = 1.0;
      break;
    case 'High':
      pitch = 1.18;
      rate = 1.02;
      volume = 1.0;
      break;
    case 'Medium':
      pitch = 1.14;
      rate = 0.98;
      volume = 0.96;
      break;
    case 'Low':
      pitch = 1.10;
      rate = 0.95;
      volume = 0.92;
      break;
    default:
      pitch = 1.14;
      rate = 0.98;
  }

  // Natural spoken phrasing in feminine assistant voice
  let speechText = '';
  const langKey = (lang || '').toLowerCase();

  if (langKey.startsWith('hi')) {
    // Hindi feminine natural phrasing
    if (priority === 'Critical') {
      speechText = `अटेंशन! यह एक क्रिटिकल सर्विस टिकट है, नंबर ${ticketNumber}। श्रेणी: ${category}, कमरा: ${room}। समस्या: ${title}। मैंने हॉस्टल वार्डन को तत्काल सूचित कर दिया है।`;
    } else if (priority === 'High') {
      speechText = `हाई प्रायोरिटी सर्विस टिकट नंबर ${ticketNumber}। श्रेणी: ${category}, स्थान: ${room}। समस्या: ${title}। टीम जल्द पहुंच रही है।`;
    } else if (priority === 'Low') {
      speechText = `हो गया। सामान्य सर्विस टिकट नंबर ${ticketNumber} बन गया है। श्रेणी: ${category}, कमरा: ${room}। प्रायोरिटी लो रखी गई है।`;
    } else {
      speechText = `हो गया। सर्विस टिकट नंबर ${ticketNumber} बन गया है। श्रेणी: ${category}, कमरा: ${room}। प्रायोरिटी मीडियम सेट कर दी गई है।`;
    }
  } else if (langKey.startsWith('bn')) {
    // Bengali feminine natural phrasing
    if (priority === 'Critical') {
      speechText = `জরুরি সতর্কতা! এটি একটি ক্রিটিক্যাল সার্ভিস টিকিট নম্বর ${ticketNumber}। বিভাগ: ${category}, স্থান: ${room}। সমস্যা: ${title}। আমি হোস্টেল কর্তৃপক্ষকে দ্রুত জানিয়ে দিয়েছি।`;
    } else if (priority === 'High') {
      speechText = `উচ্চ অগ্রাধিকার সার্ভিস টিকিট নম্বর ${ticketNumber}। বিভাগ: ${category}, স্থান: ${room}। সমস্যা: ${title}। আমাদের দল দ্রুত পৌঁছে যাবে।`;
    } else {
      speechText = `হয়ে গেছে। সার্ভিস টিকিট নম্বর ${ticketNumber} তৈরি করা হয়েছে। বিভাগ: ${category}, স্থান: ${room}। অগ্রাধিকার ${priority} সেট করা হয়েছে।`;
    }
  } else {
    // English feminine natural phrasing
    if (priority === 'Critical') {
      speechText = `Attention! Critical priority ticket number ${ticketNumber} for ${room}. Category: ${category}. Problem: ${title}. I have immediately dispatched this to the Chief Hostel Host.`;
    } else if (priority === 'High') {
      speechText = `High priority service ticket number ${ticketNumber} for ${room}. Category: ${category}. Problem: ${title}. Our team has been alerted for priority resolution.`;
    } else if (priority === 'Low') {
      speechText = `Done! Low priority service ticket number ${ticketNumber} has been created for ${room}. Category: ${category}.`;
    } else {
      speechText = `Done! Service ticket number ${ticketNumber} has been created for ${room}. Category: ${category}, with priority set to ${priority}.`;
    }
  }

  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.pitch = pitch;
  utterance.rate = rate;
  utterance.volume = volume;
  utterance.lang = lang || 'hi-IN';

  // Apply best feminine voice
  const matchedVoice = getFemaleVoice(lang);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onstart = () => {
    if (callbacks.onStart) callbacks.onStart({ speechText, priority, pitch, rate });
  };

  utterance.onend = () => {
    if (callbacks.onEnd) callbacks.onEnd();
  };

  utterance.onerror = (err) => {
    if (callbacks.onError) callbacks.onError(err);
  };

  window.speechSynthesis.speak(utterance);
  return { speechText, pitch, rate, priority };
}

/**
 * Speaks general assistant response with warm, natural feminine voice delivery
 * @param {string} text - Spoken text
 * @param {string} lang - Language code
 * @param {Object} callbacks - { onStart, onEnd, onError }
 */
export function speakFeminineResponse(text, lang = 'hi-IN', callbacks = {}) {
  if (!window.speechSynthesis || !text) {
    if (callbacks.onError) callbacks.onError('SpeechSynthesis not available');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang || 'hi-IN';
  utterance.pitch = 1.14; // Warm, natural feminine pitch
  utterance.rate = 0.98;  // Calm, unhurried, natural speaking pace
  utterance.volume = 0.96;

  const voice = getFemaleVoice(lang);
  if (voice) utterance.voice = voice;

  utterance.onstart = () => {
    if (callbacks.onStart) callbacks.onStart();
  };

  utterance.onend = () => {
    if (callbacks.onEnd) callbacks.onEnd();
  };

  utterance.onerror = (err) => {
    if (callbacks.onError) callbacks.onError(err);
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stops any ongoing modulated speech synthesis.
 */
export function stopModulatedSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
