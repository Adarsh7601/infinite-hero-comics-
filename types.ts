/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const MAX_STORY_PAGES = 10;
export const BACK_COVER_PAGE = 11;
export const TOTAL_PAGES = 11;
export const INITIAL_PAGES = 2;
export const GATE_PAGE = 2;
export const BATCH_SIZE = 6;
export const DECISION_PAGES = [3];

export const GENRES = ["Classic Horror", "Superhero Action", "Dark Sci-Fi", "High Fantasy", "Neon Noir Detective", "Wasteland Apocalypse", "Lighthearted Comedy", "Teen Drama / Slice of Life", "Custom"];
export const TONES = [
    "ACTION-HEAVY (Short, punchy dialogue. Focus on kinetics.)",
    "INNER-MONOLOGUE (Heavy captions revealing thoughts.)",
    "QUIPPY (Characters use humor as a defense mechanism.)",
    "OPERATIC (Grand, dramatic declarations and high stakes.)",
    "CASUAL (Natural dialogue, focus on relationships/gossip.)",
    "WHOLESOME (Warm, gentle, optimistic.)"
];

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  nativeName?: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es-MX', name: 'Spanish (Español)', flag: '🇲🇽', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French (Français)', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de-DE', name: 'German (Deutsch)', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'hi-IN', name: 'Hindi (हिन्दी)', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'ja-JP', name: 'Japanese (日本語)', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean (한국어)', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'pt-BR', name: 'Portuguese (Português)', flag: '🇧🇷', nativeName: 'Português' },
  { code: 'it-IT', name: 'Italian (Italiano)', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'zh-CN', name: 'Chinese Simplified (简体中文)', flag: '🇨🇳', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese Traditional (繁體中文)', flag: '🇹🇼', nativeName: '繁體中文' },
  { code: 'ru-RU', name: 'Russian (Русский)', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'ar-EG', name: 'Arabic (العربية)', flag: '🇪🇬', nativeName: 'العربية' },
  { code: 'tr-TR', name: 'Turkish (Türkçe)', flag: '🇹🇷', nativeName: 'Türkçe' },
  { code: 'nl-NL', name: 'Dutch (Nederlands)', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'pl-PL', name: 'Polish (Polski)', flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'id-ID', name: 'Indonesian (Bahasa)', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'vi-VN', name: 'Vietnamese (Tiếng Việt)', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'th-TH', name: 'Thai (ไทย)', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)', flag: '🇮🇳', nativeName: 'বাংলা' },
  { code: 'ua-UA', name: 'Ukrainian (Українська)', flag: '🇺🇦', nativeName: 'Українська' },
  { code: 'sv-SE', name: 'Swedish (Svenska)', flag: '🇸🇪', nativeName: 'Svenska' },
  { code: 'el-GR', name: 'Greek (Ελληνικά)', flag: '🇬🇷', nativeName: 'Ελληνικά' },
  { code: 'tl-PH', name: 'Filipino (Tagalog)', flag: '🇵🇭', nativeName: 'Tagalog' }
];

export interface ComicFace {
  id: string;
  type: 'cover' | 'story' | 'back_cover';
  imageUrl?: string;
  narrative?: Beat;
  choices: string[];
  resolvedChoice?: string;
  isLoading: boolean;
  pageIndex?: number;
  isDecisionPage?: boolean;
}

export interface Beat {
  caption?: string;
  dialogue?: string;
  scene: string;
  choices: string[];
  focus_char: 'hero' | 'friend' | 'other';
}

export interface Persona {
  base64: string;
  desc: string;
}