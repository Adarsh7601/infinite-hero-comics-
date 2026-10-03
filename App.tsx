
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import { MAX_STORY_PAGES, BACK_COVER_PAGE, TOTAL_PAGES, INITIAL_PAGES, BATCH_SIZE, DECISION_PAGES, GENRES, TONES, LANGUAGES, ComicFace, Beat, Persona } from './types';
import { Setup } from './Setup';
import { Book } from './Book';
import { useApiKey } from './useApiKey';
import { generateComicFallbackPanel } from './comicCanvasFallback';
import { LanguageModal } from './LanguageModal';
import { ReaderBar } from './ReaderBar';

// --- Constants ---
// Free, fast, and high-performance models for unlimited, cost-free comics
const MODEL_TEXT_NAME = "gemini-3.8-flash";
const MODEL_IMAGE_GEN_NAME = "gemini-3.1-flash-lite-image";
const MODEL_IMAGE_FALLBACK_NAME = "gemini-3-pro-image-preview";

const TOTAL_SHEETS = 6;

const App: React.FC = () => {
  // --- Free Access Hook ---
  const { validateApiKey } = useApiKey();

  const [hero, setHeroState] = useState<Persona | null>(null);
  const [friend, setFriendState] = useState<Persona | null>(null);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].code);
  const [customPremise, setCustomPremise] = useState("");
  const [storyTone, setStoryTone] = useState(TONES[0]);
  const [richMode, setRichMode] = useState(true);
  
  // --- Language Switcher & Reader States ---
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [langToast, setLangToast] = useState<string | null>(null);
  
  const heroRef = useRef<Persona | null>(null);
  const friendRef = useRef<Persona | null>(null);

  const setHero = (p: Persona | null) => { setHeroState(p); heroRef.current = p; };
  const setFriend = (p: Persona | null) => { setFriendState(p); friendRef.current = p; };
  
  const [comicFaces, setComicFaces] = useState<ComicFace[]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  
  // --- Transition States ---
  const [showSetup, setShowSetup] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const generatingPages = useRef(new Set<number>());
  const historyRef = useRef<ComicFace[]>([]);

  // --- AI Helpers ---
  // Helper to always get a fresh instance with the selected key
  const getAI = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  };

  const handleAPIError = (e: any) => {
    const msg = String(e);
    console.warn("Gemini Free Mode Note:", msg);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateBeat = async (history: ComicFace[], isRightPage: boolean, pageNum: number, isDecisionPage: boolean): Promise<Beat> => {
    if (!heroRef.current) throw new Error("No Hero");

    const isFinalPage = pageNum === MAX_STORY_PAGES;
    const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";

    // Get relevant history and last focus to prevent repetition
    const relevantHistory = history
        .filter(p => p.type === 'story' && p.narrative && (p.pageIndex || 0) < pageNum)
        .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    const lastBeat = relevantHistory[relevantHistory.length - 1]?.narrative;
    const lastFocus = lastBeat?.focus_char || 'none';

    const historyText = relevantHistory.map(p => 
      `[Page ${p.pageIndex}] [Focus: ${p.narrative?.focus_char}] (Caption: "${p.narrative?.caption || ''}") (Dialogue: "${p.narrative?.dialogue || ''}") (Scene: ${p.narrative?.scene}) ${p.resolvedChoice ? `-> USER CHOICE: "${p.resolvedChoice}"` : ''}`
    ).join('\n');

    // Aggressive Co-Star Injection Logic
    let friendInstruction = "Not yet introduced.";
    if (friendRef.current) {
        friendInstruction = "ACTIVE and PRESENT (User Provided).";
        // If the last panel wasn't the friend, strongly suggest switching to them to maintain balance.
        if (lastFocus !== 'friend' && Math.random() > 0.4) {
             friendInstruction += " MANDATORY: FOCUS ON THE CO-STAR FOR THIS PANEL.";
        } else {
             friendInstruction += " Ensure they are woven into the scene even if not the main focus.";
        }
    }

    // Determine Core Story Driver (Genre vs Custom Premise)
    let coreDriver = `GENRE: ${selectedGenre}. TONE: ${storyTone}.`;
    if (selectedGenre === 'Custom') {
        coreDriver = `STORY PREMISE: ${customPremise || "A totally unique, unpredictable adventure"}. (Follow this premise strictly over standard genre tropes).`;
    }
    
    const isSliceOfLife = selectedGenre.includes("Comedy") || selectedGenre.includes("Teen") || selectedGenre.includes("Slice");

    // Guardrails to prevent everything becoming "Quantum Sci-Fi"
    const guardrails = `
    NEGATIVE CONSTRAINTS:
    1. UNLESS GENRE IS "Dark Sci-Fi" OR "Superhero Action" OR "Custom": DO NOT use technical jargon like "Quantum", "Timeline", "Portal", "Multiverse", or "Singularity".
    2. IF GENRE IS "Teen Drama" OR "Lighthearted Comedy": The "stakes" must be SOCIAL, EMOTIONAL, or PERSONAL (e.g., a rumor, a competition, a broken promise, being late, embarrassing oneself). Do NOT make it life-or-death. Keep it grounded.
    3. Avoid "The artifact" or "The device" unless established earlier.
    `;

    // BASE INSTRUCTION: Strictly enforce language for output text.
    let instruction = `Continue the story. ALL OUTPUT TEXT (Captions, Dialogue, Choices) MUST BE IN ${langName.toUpperCase()}. ${coreDriver} ${guardrails}`;
    if (richMode) {
        instruction += " RICH/NOVEL MODE ENABLED. Prioritize deeper character thoughts, descriptive captions, and meaningful dialogue exchanges over short punchlines.";
    }

    if (isFinalPage) {
        instruction += " FINAL PAGE. KARMIC CLIFFHANGER REQUIRED. You MUST explicitly reference the User's choice from PAGE 3 in the narrative and show how that specific philosophy led to this conclusion. Text must end with 'TO BE CONTINUED...' (or localized equivalent).";
    } else if (isDecisionPage) {
        instruction += " End with a PSYCHOLOGICAL choice about VALUES, RELATIONSHIPS, or RISK. (e.g., Truth vs. Safety, Forgive vs. Avenge). The options must NOT be simple physical actions like 'Go Left'.";
    } else {
        // Neutralized Narrative Arc to avoid forcing "scary mystery" tones if the genre doesn't call for it.
        if (pageNum === 1) {
            instruction += " INCITING INCIDENT. An event disrupts the status quo. Establish the genre's intended mood. (If Slice of Life: A social snag/surprise. If Adventure: A call to action).";
        } else if (pageNum <= 4) {
            instruction += " RISING ACTION. The heroes engage with the new situation. Focus on dialogue, character dynamics, and initial challenges.";
        } else if (pageNum <= 8) {
            instruction += " COMPLICATION. A twist occurs! A secret is revealed, a misunderstanding deepens, or the path is blocked. (Keep intensity appropriate to Genre - e.g. Social awkwardness for Comedy, Danger for Horror).";
        } else {
            instruction += " CLIMAX. The confrontation with the main conflict. The truth comes out, the contest ends, or the battle is fought.";
        }
    }

    // Dynamic text limits based on richMode
    const capLimit = richMode ? "max 35 words. Detailed narration or internal monologue" : "max 15 words";
    const diaLimit = richMode ? "max 30 words. Rich, character-driven speech" : "max 12 words";

    const prompt = `
You are writing a comic book script. PAGE ${pageNum} of ${MAX_STORY_PAGES}.
TARGET LANGUAGE FOR TEXT: ${langName} (CRITICAL: CAPTIONS, DIALOGUE, CHOICES MUST BE IN THIS LANGUAGE).
${coreDriver}

CHARACTERS:
- HERO: Active.
- CO-STAR: ${friendInstruction}

PREVIOUS PANELS (READ CAREFULLY):
${historyText.length > 0 ? historyText : "Start the adventure."}

RULES:
1. NO REPETITION. Do not use the same captions or dialogue from previous pages.
2. IF CO-STAR IS ACTIVE, THEY MUST APPEAR FREQUENTLY.
3. VARIETY. If page ${pageNum-1} was an action shot, make this one a reaction or wide shot.
4. LANGUAGE: All user-facing text MUST be in ${langName}.
5. Avoid saying "CO-star" and "hero" in the text captions. Use names if established, or generic descriptors.

INSTRUCTION: ${instruction}

OUTPUT STRICT JSON ONLY (No markdown formatting):
{
  "caption": "Unique narrator text in ${langName}. (${capLimit}).",
  "dialogue": "Unique speech in ${langName}. (${diaLimit}). Optional.",
  "scene": "Vivid visual description (ALWAYS IN ENGLISH for the artist model). MUST mention 'HERO' or 'CO-STAR' if they are present.",
  "focus_char": "hero" OR "friend" OR "other",
  "choices": ["Option A in ${langName}", "Option B in ${langName}"] (Only if decision page)
}
`;
    try {
        const ai = getAI();
        const res = await ai.models.generateContent({ model: MODEL_TEXT_NAME, contents: prompt, config: { responseMimeType: 'application/json' } });
        let rawText = res.text || "{}";
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsed = JSON.parse(rawText);
        
        if (parsed.dialogue) parsed.dialogue = parsed.dialogue.replace(/^[\w\s\-]+:\s*/i, '').replace(/["']/g, '').trim();
        if (parsed.caption) parsed.caption = parsed.caption.replace(/^[\w\s\-]+:\s*/i, '').trim();
        if (!isDecisionPage) parsed.choices = [];
        if (isDecisionPage && !isFinalPage && (!parsed.choices || parsed.choices.length < 2)) parsed.choices = ["Option A", "Option B"];
        if (!['hero', 'friend', 'other'].includes(parsed.focus_char)) parsed.focus_char = 'hero';

        return parsed as Beat;
    } catch (e) {
        console.error("Beat generation failed", e);
        handleAPIError(e);
        const fallbackChoices = isDecisionPage && !isFinalPage
            ? (selectedLanguage.startsWith('es') ? ["Luchar con valentía", "Buscar refugio estratégico"]
             : selectedLanguage.startsWith('fr') ? ["Combattre avec bravoure", "Chercher un abri"]
             : selectedLanguage.startsWith('de') ? ["Mutig kämpfen", "Strategischen Rückzug antreten"]
             : selectedLanguage.startsWith('hi') ? ["डटकर मुकाबला करो", "रणनीतिक योजना बनाओ"]
             : selectedLanguage.startsWith('ja') ? ["立ち向かって戦う", "一度後退して作戦を練る"]
             : ["Stand and Fight", "Search for Strategic Shelter"])
            : [];
        return { 
            caption: pageNum === 1 ? "The story begins as a mysterious crisis shakes the hero's world!" : `Page ${pageNum}: The heroes press on through great peril!`, 
            scene: `Dramatic comic scene for page ${pageNum}.`, 
            focus_char: 'hero', 
            choices: fallbackChoices
        };
    }
  };

  const generatePersona = async (desc: string): Promise<Persona> => {
      const style = selectedGenre === 'Custom' ? "Modern American comic book art" : `${selectedGenre} comic`;
      const ai = getAI();
      // Try primary image model
      try {
          const res = await ai.models.generateContent({
              model: MODEL_IMAGE_GEN_NAME,
              contents: { text: `STYLE: Masterpiece ${style} character sheet, detailed ink, neutral background. FULL BODY. Character: ${desc}` },
              config: { imageConfig: { aspectRatio: '1:1' } }
          });
          const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (part?.inlineData?.data) return { base64: part.inlineData.data, desc };
      } catch (e) {
          // Try fallback model
          try {
              const res2 = await ai.models.generateContent({
                  model: MODEL_IMAGE_FALLBACK_NAME,
                  contents: { text: `STYLE: Masterpiece ${style} character sheet, detailed ink, neutral background. FULL BODY. Character: ${desc}` },
                  config: { imageConfig: { aspectRatio: '1:1' } }
              });
              const part2 = res2.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
              if (part2?.inlineData?.data) return { base64: part2.inlineData.data, desc };
          } catch (e2) {
              handleAPIError(e2);
          }
      }
      // If image generation is unavailable, use hero reference as co-star persona base
      return { base64: heroRef.current?.base64 || '', desc };
  };

  const generateImage = async (beat: Beat, type: ComicFace['type'], pageNum = 0): Promise<string> => {
    const contents = [];
    if (heroRef.current?.base64) {
        contents.push({ text: "REFERENCE 1 [HERO]:" });
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: heroRef.current.base64 } });
    }
    if (friendRef.current?.base64) {
        contents.push({ text: "REFERENCE 2 [CO-STAR]:" });
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: friendRef.current.base64 } });
    }

    const styleEra = selectedGenre === 'Custom' ? "Modern American" : selectedGenre;
    let promptText = `STYLE: ${styleEra} comic book art, detailed ink, vibrant colors. `;
    
    if (type === 'cover') {
        const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";
        promptText += `TYPE: Comic Book Cover. TITLE: "INFINITE HEROES" (OR LOCALIZED TRANSLATION IN ${langName.toUpperCase()}). Main visual: Dynamic action shot of [HERO] (Use REFERENCE 1).`;
    } else if (type === 'back_cover') {
        promptText += `TYPE: Comic Back Cover. FULL PAGE VERTICAL ART. Dramatic teaser. Text: "NEXT ISSUE SOON".`;
    } else {
        promptText += `TYPE: Vertical comic panel. SCENE: ${beat.scene}. `;
        promptText += `INSTRUCTIONS: Maintain strict character likeness. If scene mentions 'HERO', you MUST use REFERENCE 1. If scene mentions 'CO-STAR' or 'SIDEKICK', you MUST use REFERENCE 2.`;
        
        if (beat.caption) promptText += ` INCLUDE CAPTION BOX: "${beat.caption}"`;
        if (beat.dialogue) promptText += ` INCLUDE SPEECH BUBBLE: "${beat.dialogue}"`;
    }

    contents.push({ text: promptText });

    // Attempt generation with primary model
    try {
        const ai = getAI();
        const res = await ai.models.generateContent({
          model: MODEL_IMAGE_GEN_NAME,
          contents: contents,
          config: { imageConfig: { aspectRatio: '2:3' } }
        });
        const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData?.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    } catch (e) {
        // Attempt fallback model
        try {
            const ai = getAI();
            const res2 = await ai.models.generateContent({
              model: MODEL_IMAGE_FALLBACK_NAME,
              contents: contents,
              config: { imageConfig: { aspectRatio: '2:3' } }
            });
            const part2 = res2.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part2?.inlineData?.data) {
              return `data:${part2.inlineData.mimeType};base64,${part2.inlineData.data}`;
            }
        } catch (e2) {
            handleAPIError(e2);
        }
    }

    // Always guarantee a stylized comic panel so the comic is 100% free and uninterrupted
    return generateComicFallbackPanel({
      type,
      pageNum,
      beat,
      heroBase64: heroRef.current?.base64,
      friendBase64: friendRef.current?.base64,
      genre: selectedGenre,
      language: selectedLanguage,
    });
  };

  const updateFaceState = (id: string, updates: Partial<ComicFace>) => {
      setComicFaces(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      const idx = historyRef.current.findIndex(f => f.id === id);
      if (idx !== -1) historyRef.current[idx] = { ...historyRef.current[idx], ...updates };
  };

  const generateSinglePage = async (faceId: string, pageNum: number, type: ComicFace['type']) => {
    const isDecision = DECISION_PAGES.includes(pageNum);
    try {
      let beat: Beat = { scene: "", choices: [], focus_char: 'other' };

      if (type === 'cover') {
           // Cover beat is handled in generateImage
      } else if (type === 'back_cover') {
           beat = { scene: "Thematic teaser image", choices: [], focus_char: 'other' };
      } else {
           beat = await generateBeat(historyRef.current, pageNum % 2 === 0, pageNum, isDecision);
      }

      if (beat.focus_char === 'friend' && !friendRef.current && type === 'story') {
          try {
              const newSidekick = await generatePersona(selectedGenre === 'Custom' ? "A fitting sidekick for this story" : `Sidekick for ${selectedGenre} story.`);
              setFriend(newSidekick);
          } catch (e) { beat.focus_char = 'other'; }
      }

      updateFaceState(faceId, { narrative: beat, choices: beat.choices, isDecisionPage: isDecision });
      const url = await generateImage(beat, type, pageNum);
      updateFaceState(faceId, { imageUrl: url, isLoading: false });
    } catch (err) {
      console.error(`Page ${pageNum} generation error:`, err);
      const fallbackBeat: Beat = {
        scene: `Dynamic action scene on page ${pageNum}`,
        caption: `Page ${pageNum}: The heroic saga moves forward through unexpected turns!`,
        dialogue: "We must stay focused and overcome this together!",
        choices: isDecision ? ["Press forward boldly", "Take cover and strategize"] : [],
        focus_char: 'hero'
      };
      const fallbackUrl = await generateComicFallbackPanel({
        type,
        pageNum,
        beat: fallbackBeat,
        heroBase64: heroRef.current?.base64,
        friendBase64: friendRef.current?.base64,
        genre: selectedGenre,
        language: selectedLanguage,
      });
      updateFaceState(faceId, {
        narrative: fallbackBeat,
        choices: fallbackBeat.choices,
        isDecisionPage: isDecision,
        imageUrl: fallbackUrl,
        isLoading: false
      });
    }
  };

  const generateBatch = async (startPage: number, count: number) => {
      const pagesToGen: number[] = [];
      for (let i = 0; i < count; i++) {
          const p = startPage + i;
          if (p <= TOTAL_PAGES && !generatingPages.current.has(p)) {
              pagesToGen.push(p);
          }
      }
      
      if (pagesToGen.length === 0) return;
      pagesToGen.forEach(p => generatingPages.current.add(p));

      const newFaces: ComicFace[] = [];
      pagesToGen.forEach(pageNum => {
          const type = pageNum === BACK_COVER_PAGE ? 'back_cover' : 'story';
          newFaces.push({ id: `page-${pageNum}`, type, choices: [], isLoading: true, pageIndex: pageNum });
      });

      setComicFaces(prev => {
          const existing = new Set(prev.map(f => f.id));
          return [...prev, ...newFaces.filter(f => !existing.has(f.id))];
      });
      newFaces.forEach(f => { if (!historyRef.current.find(h => h.id === f.id)) historyRef.current.push(f); });

      try {
          for (const pageNum of pagesToGen) {
               await generateSinglePage(`page-${pageNum}`, pageNum, pageNum === BACK_COVER_PAGE ? 'back_cover' : 'story');
               generatingPages.current.delete(pageNum);
          }
      } catch (e) {
          console.error("Batch generation error", e);
      } finally {
          pagesToGen.forEach(p => generatingPages.current.delete(p));
      }
  }

  const launchStory = async () => {
    // --- API KEY VALIDATION ---
    const hasKey = await validateApiKey();
    if (!hasKey) return; // Stop if cancelled or invalid
    
    if (!heroRef.current) return;
    if (selectedGenre === 'Custom' && !customPremise.trim()) {
        alert("Please enter a custom story premise.");
        return;
    }
    setIsTransitioning(true);
    
    let availableTones = TONES;
    if (selectedGenre === "Teen Drama / Slice of Life" || selectedGenre === "Lighthearted Comedy") {
        availableTones = TONES.filter(t => t.includes("CASUAL") || t.includes("WHOLESOME") || t.includes("QUIPPY"));
    } else if (selectedGenre === "Classic Horror") {
        availableTones = TONES.filter(t => t.includes("INNER-MONOLOGUE") || t.includes("OPERATIC"));
    }
    
    setStoryTone(availableTones[Math.floor(Math.random() * availableTones.length)]);

    const coverFace: ComicFace = { id: 'cover', type: 'cover', choices: [], isLoading: true, pageIndex: 0 };
    setComicFaces([coverFace]);
    historyRef.current = [coverFace];
    generatingPages.current.add(0);

    generateSinglePage('cover', 0, 'cover').finally(() => generatingPages.current.delete(0));
    
    setTimeout(async () => {
        setIsStarted(true);
        setShowSetup(false);
        setIsTransitioning(false);
        await generateBatch(1, INITIAL_PAGES);
        generateBatch(3, 3);
    }, 1100);
  };

  const handleChoice = async (pageIndex: number, choice: string) => {
      updateFaceState(`page-${pageIndex}`, { resolvedChoice: choice });
      // Queue remaining pages 6 through 11
      const nextBatchStart = 6;
      if (nextBatchStart <= TOTAL_PAGES) {
          generateBatch(nextBatchStart, TOTAL_PAGES - nextBatchStart + 1);
      }
  };

  const handleSelectLanguage = async (newCode: string, translateExisting = false) => {
      setSelectedLanguage(newCode);
      const langObj = LANGUAGES.find(l => l.code === newCode);
      const langName = langObj?.name || newCode;

      if (translateExisting && comicFaces.some(f => f.type === 'story' && f.narrative)) {
          await translateEntireIssue(newCode);
      } else {
          setLangToast(`Language set to ${langName}!`);
          setTimeout(() => setLangToast(null), 3500);
      }
  };

  const translateEntireIssue = async (newCode: string) => {
      const langObj = LANGUAGES.find(l => l.code === newCode);
      const targetLangName = langObj?.name || newCode;
      setIsTranslating(true);
      setLangToast(`Translating story into ${targetLangName}...`);

      try {
          const ai = getAI();
          const storyPages = comicFaces.filter(f => f.type === 'story' && f.narrative);
          if (storyPages.length === 0) {
              setSelectedLanguage(newCode);
              return;
          }

          const prompt = `You are a professional comic book translator.
Translate the narrative captions, dialogue, and choices for each of the following comic panels into ${targetLangName}.
Preserve excitement, comic tone, and dynamic dialogue.

PANELS:
${JSON.stringify(storyPages.map(p => ({
  pageIndex: p.pageIndex,
  caption: p.narrative?.caption || "",
  dialogue: p.narrative?.dialogue || "",
  choices: p.choices || []
})))}

OUTPUT STRICT JSON ONLY:
[
  { "pageIndex": 1, "caption": "Translated caption in ${targetLangName}", "dialogue": "Translated dialogue in ${targetLangName}", "choices": ["..."] }
]`;

          const res = await ai.models.generateContent({
              model: MODEL_TEXT_NAME,
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          let rawText = (res.text || "[]").replace(/```json/g, '').replace(/```/g, '').trim();
          const translatedItems: Array<{ pageIndex: number; caption?: string; dialogue?: string; choices?: string[] }> = JSON.parse(rawText);

          for (const item of translatedItems) {
              const face = comicFaces.find(f => f.pageIndex === item.pageIndex);
              if (face && face.narrative) {
                  const updatedBeat: Beat = {
                      ...face.narrative,
                      caption: item.caption || face.narrative.caption,
                      dialogue: item.dialogue || face.narrative.dialogue,
                      choices: item.choices && item.choices.length > 0 ? item.choices : face.choices
                  };
                  updateFaceState(face.id, {
                      narrative: updatedBeat,
                      choices: updatedBeat.choices
                  });
              }
          }
          setSelectedLanguage(newCode);
          setLangToast(`Translated into ${targetLangName}!`);
          setTimeout(() => setLangToast(null), 3500);
      } catch (e) {
          console.warn("Translation notice:", e);
          setSelectedLanguage(newCode);
          setLangToast(`Language set to ${targetLangName}. Future panels will be in this language.`);
          setTimeout(() => setLangToast(null), 4000);
      } finally {
          setIsTranslating(false);
      }
  };

  const resetApp = () => {
      setIsStarted(false);
      setShowSetup(true);
      setComicFaces([]);
      setCurrentSheetIndex(0);
      historyRef.current = [];
      generatingPages.current.clear();
      setHero(null);
      setFriend(null);
      setIsTranslating(false);
      setLangToast(null);
  };

  const downloadPDF = () => {
    const PAGE_WIDTH = 480;
    const PAGE_HEIGHT = 720;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [PAGE_WIDTH, PAGE_HEIGHT] });
    const pagesToPrint = comicFaces.filter(face => face.imageUrl && !face.isLoading).sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    pagesToPrint.forEach((face, index) => {
        if (index > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
        if (face.imageUrl) {
            const isPng = face.imageUrl.startsWith('data:image/png');
            doc.addImage(face.imageUrl, isPng ? 'PNG' : 'JPEG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
        }
    });
    const currentLangObj = LANGUAGES.find(l => l.code === selectedLanguage);
    const langLabel = currentLangObj ? currentLangObj.name.split(' ')[0] : 'Comic';
    doc.save(`Infinite-Heroes-${langLabel}.pdf`);
  };

  const handleHeroUpload = async (file: File) => {
       try { const base64 = await fileToBase64(file); setHero({ base64, desc: "The Main Hero" }); } catch (e) { alert("Hero upload failed"); }
  };
  const handleFriendUpload = async (file: File) => {
       try { const base64 = await fileToBase64(file); setFriend({ base64, desc: "The Sidekick/Rival" }); } catch (e) { alert("Friend upload failed"); }
  };

  // --- Smooth Sheet Navigation ---
  const canGoPrev = isStarted && currentSheetIndex > 0;
  const canGoNext = isStarted && currentSheetIndex < TOTAL_SHEETS;

  const goToPrevSheet = () => {
      if (!canGoPrev) return;
      setCurrentSheetIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextSheet = () => {
      if (!canGoNext) return;
      // Guard: On Sheet 2 (which contains Page 3 on the left), require decision choice before turning
      if (currentSheetIndex === 2) {
          const page3 = comicFaces.find(f => f.pageIndex === 3);
          if (page3 && page3.isDecisionPage && !page3.resolvedChoice) {
              alert("Hero! Please make your choice on Page 3 before proceeding!");
              return;
          }
      }
      setCurrentSheetIndex(prev => Math.min(TOTAL_SHEETS, prev + 1));
  };

  const handleSheetClick = (clickedIndex: number) => {
      if (!isStarted) return;
      if (clickedIndex === 0 && currentSheetIndex === 0) return;
      if (clickedIndex < currentSheetIndex) {
          // Clicked left flipped sheet -> go back
          goToPrevSheet();
      } else {
          // Clicked right open sheet -> go forward
          goToNextSheet();
      }
  };

  // Keyboard navigation for accessible comic reading
  React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isStarted || showSetup || isTransitioning) return;
          if (e.key === 'ArrowRight' || e.key === 'PageDown') {
              goToNextSheet();
          } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
              goToPrevSheet();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, showSetup, isTransitioning, currentSheetIndex, comicFaces]);

  // Check if next spread is still generating
  const nextTargetPage = currentSheetIndex === 0 ? 1 : (currentSheetIndex * 2);
  const isNextLoading = !comicFaces.find(f => f.pageIndex === nextTargetPage)?.imageUrl;

  return (
    <div className="comic-scene">
      {/* Toast Notification */}
      {langToast && (
        <div className="fixed top-16 md:top-20 inset-x-0 z-[400] flex justify-center pointer-events-none">
          <div className="bg-yellow-400 text-black font-comic text-base md:text-lg font-bold px-5 py-2 border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] uppercase tracking-wide animate-in fade-in slide-in-from-top-4 duration-200">
            {langToast}
          </div>
        </div>
      )}

      {/* Reader Navigation & Controls */}
      <ReaderBar 
          currentSheetIndex={currentSheetIndex}
          totalSheets={TOTAL_SHEETS}
          selectedLanguage={selectedLanguage}
          isStarted={isStarted}
          canGoNext={canGoNext}
          canGoPrev={canGoPrev}
          isNextLoading={isNextLoading && currentSheetIndex === 0}
          isTranslating={isTranslating}
          onPrev={goToPrevSheet}
          onNext={goToNextSheet}
          onOpenLanguageModal={() => setShowLanguageModal(true)}
          onDownloadPDF={downloadPDF}
          onReset={resetApp}
      />

      {/* Interactive Language Selector Modal */}
      <LanguageModal 
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={handleSelectLanguage}
          isComicStarted={isStarted}
          isTranslating={isTranslating}
      />

      <Setup 
          show={showSetup}
          isTransitioning={isTransitioning}
          hero={hero}
          friend={friend}
          selectedGenre={selectedGenre}
          selectedLanguage={selectedLanguage}
          customPremise={customPremise}
          richMode={richMode}
          onHeroUpload={handleHeroUpload}
          onFriendUpload={handleFriendUpload}
          onGenreChange={setSelectedGenre}
          onLanguageChange={(val) => handleSelectLanguage(val, false)}
          onOpenLanguageModal={() => setShowLanguageModal(true)}
          onPremiseChange={setCustomPremise}
          onRichModeChange={setRichMode}
          onLaunch={launchStory}
      />
      
      <Book 
          comicFaces={comicFaces}
          currentSheetIndex={currentSheetIndex}
          isStarted={isStarted}
          isSetupVisible={showSetup && !isTransitioning}
          onSheetClick={handleSheetClick}
          onChoice={handleChoice}
          onOpenBook={() => setCurrentSheetIndex(1)}
          onDownload={downloadPDF}
          onReset={resetApp}
      />
    </div>
  );
};

export default App;
