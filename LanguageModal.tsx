/**
 * Interactive Language Switcher Modal.
 * Allows users to change story and narration language at any time,
 * with search, country flags, native names, and instant issue translation.
 */

import React, { useState } from 'react';
import { LANGUAGES, LanguageOption } from './types';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onSelectLanguage: (code: string, translateExisting?: boolean) => void;
  isComicStarted: boolean;
  isTranslating?: boolean;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
  isComicStarted,
  isTranslating = false,
}) => {
  const [search, setSearch] = useState('');
  const [pendingLang, setPendingLang] = useState(selectedLanguage);

  if (!isOpen) return null;

  const filteredLanguages = LANGUAGES.filter((lang) => {
    const q = search.toLowerCase();
    return (
      lang.name.toLowerCase().includes(q) ||
      (lang.nativeName && lang.nativeName.toLowerCase().includes(q)) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  const currentObj = LANGUAGES.find((l) => l.code === (pendingLang || selectedLanguage));

  const handleApply = (translate: boolean) => {
    onSelectLanguage(pendingLang, translate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-w-2xl w-full bg-white border-[6px] border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] p-6 md:p-8 rotate-[0.5deg] max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-11 h-11 bg-red-600 hover:bg-red-500 text-white font-comic text-2xl font-bold border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-transform active:scale-95"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-4 text-left border-b-4 border-black pb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🌐</span>
            <div>
              <h2
                className="font-comic text-4xl text-black leading-none uppercase tracking-wide"
                style={{ textShadow: '1px 1px 0px #ffe600' }}
              >
                Change Story Language
              </h2>
              <p className="font-comic text-base text-gray-700 mt-1">
                Choose from 24+ languages. Captions, dialogue, and choices will adapt to your selection.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search language (e.g. Spanish, Hindi, French, 日本語)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full font-comic text-lg p-2.5 pl-10 border-3 border-black bg-yellow-50 text-black placeholder:text-gray-500 focus:outline-none focus:bg-white shadow-[3px_3px_0px_rgba(0,0,0,0.3)]"
            />
            <span className="absolute left-3 top-2.5 text-lg">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-black font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-[320px]">
          {filteredLanguages.map((lang: LanguageOption) => {
            const isSelected = pendingLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setPendingLang(lang.code)}
                className={`flex items-center justify-between p-2.5 border-2 border-black transition-all text-left ${
                  isSelected
                    ? 'bg-yellow-400 font-bold shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-[1.01]'
                    : 'bg-gray-50 hover:bg-yellow-100 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <div className="font-comic text-base text-black leading-tight">
                      {lang.name}
                    </div>
                    {lang.nativeName && (
                      <div className="font-sans text-xs text-gray-600">
                        {lang.nativeName}
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <span className="bg-black text-yellow-300 font-comic text-xs px-2 py-0.5 rounded border border-black uppercase font-bold">
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="border-t-4 border-black pt-3 flex flex-col sm:flex-row gap-2 justify-between items-center bg-gray-50 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-4">
          <div className="text-left font-comic text-sm text-gray-700">
            Selected: <span className="font-bold text-black text-base">{currentObj?.flag} {currentObj?.name}</span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {isComicStarted && (
              <button
                type="button"
                disabled={isTranslating}
                onClick={() => handleApply(true)}
                className="comic-btn bg-purple-600 hover:bg-purple-500 text-white text-base px-4 py-2 flex-1 sm:flex-none uppercase tracking-wide shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                title="Translate all generated panels to this language"
              >
                {isTranslating ? 'Translating...' : 'Translate Entire Issue'}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleApply(false)}
              className="comic-btn bg-green-600 hover:bg-green-500 text-white text-lg px-6 py-2 flex-1 sm:flex-none uppercase tracking-wide shadow-[3px_3px_0px_rgba(0,0,0,1)]"
            >
              {isComicStarted ? 'Use for Next Panels' : 'Confirm Language'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
