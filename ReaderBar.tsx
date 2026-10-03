/**
 * Reader Navigation and Control Toolbar.
 * Provides accessible page navigation, spread indicators,
 * real-time language switcher, PDF download, and new issue trigger.
 */

import React from 'react';
import { LANGUAGES, TOTAL_PAGES } from './types';

interface ReaderBarProps {
  currentSheetIndex: number;
  totalSheets: number;
  selectedLanguage: string;
  isStarted: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  isNextLoading: boolean;
  isTranslating: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenLanguageModal: () => void;
  onDownloadPDF: () => void;
  onReset: () => void;
}

export const ReaderBar: React.FC<ReaderBarProps> = ({
  currentSheetIndex,
  totalSheets,
  selectedLanguage,
  isStarted,
  canGoNext,
  canGoPrev,
  isNextLoading,
  isTranslating,
  onPrev,
  onNext,
  onOpenLanguageModal,
  onDownloadPDF,
  onReset,
}) => {
  if (!isStarted) return null;

  const currentLang = LANGUAGES.find((l) => l.code === selectedLanguage);

  // Determine current spread label
  let spreadLabel = 'COVER';
  if (currentSheetIndex === 1) spreadLabel = 'PAGES 1 - 2';
  else if (currentSheetIndex === 2) spreadLabel = 'PAGES 3 - 4 (CHOICE)';
  else if (currentSheetIndex === 3) spreadLabel = 'PAGES 5 - 6';
  else if (currentSheetIndex === 4) spreadLabel = 'PAGES 7 - 8';
  else if (currentSheetIndex === 5) spreadLabel = 'PAGES 9 - 10';
  else if (currentSheetIndex >= 6) spreadLabel = 'BACK COVER';

  return (
    <>
      {/* Top Floating Control Bar */}
      <div className="fixed top-2 inset-x-2 md:top-4 md:inset-x-8 z-[350] pointer-events-auto">
        <div className="max-w-6xl mx-auto bg-black/90 text-white border-4 border-yellow-400 p-2 md:px-5 md:py-2.5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-2 font-comic backdrop-blur-md">
          {/* Left: Title & Spread indicator */}
          <div className="flex items-center gap-2 md:gap-4">
            <span className="bg-red-600 text-white text-xs md:text-sm px-2 py-0.5 border border-white font-bold tracking-wider uppercase">
              ISSUE #1
            </span>
            <div className="text-yellow-400 font-bold text-sm md:text-lg tracking-wide uppercase">
              {spreadLabel}
            </div>
            <span className="text-gray-400 text-xs hidden sm:inline">
              (Sheet {currentSheetIndex}/{totalSheets - 1})
            </span>
          </div>

          {/* Center/Right: Language Switcher, PDF, Reset */}
          <div className="flex items-center gap-2">
            {/* Real-time Language Switcher Option */}
            <button
              onClick={onOpenLanguageModal}
              className="comic-btn bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm px-3 py-1.5 border-2 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.5)] flex items-center gap-1.5 transition-transform active:scale-95"
              title="Click to change comic language"
            >
              <span className="text-base">{currentLang?.flag || '🌐'}</span>
              <span className="uppercase font-bold tracking-wide">
                {currentLang ? currentLang.name.split(' ')[0] : 'Language'}
              </span>
              <span className="text-yellow-300 text-xs font-sans">▾</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={onDownloadPDF}
              className="comic-btn bg-yellow-400 hover:bg-yellow-300 text-black text-xs md:text-sm px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.5)] uppercase font-bold tracking-wide hidden sm:inline-flex items-center gap-1"
              title="Download entire comic as PDF"
            >
              <span>📥</span> PDF
            </button>

            {/* Reset / New Adventure */}
            <button
              onClick={onReset}
              className="comic-btn bg-gray-800 hover:bg-red-600 text-white text-xs md:text-sm px-2.5 py-1.5 border-2 border-gray-600 hover:border-black shadow-[2px_2px_0px_rgba(0,0,0,0.5)] uppercase transition-colors"
              title="Start a new comic adventure"
            >
              NEW
            </button>
          </div>
        </div>

        {/* Translation in Progress Banner */}
        {isTranslating && (
          <div className="max-w-md mx-auto mt-2 bg-yellow-400 text-black font-comic text-base font-bold py-1 px-4 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] text-center animate-pulse">
            🌐 Translating comic into {currentLang?.name}... Please wait!
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation Arrows */}
      <div className="fixed bottom-4 inset-x-4 md:bottom-6 md:inset-x-12 z-[350] pointer-events-none flex justify-between items-center">
        {/* Previous Page Button */}
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className={`pointer-events-auto comic-btn text-lg md:text-xl px-4 md:px-6 py-2.5 border-4 border-black shadow-[5px_5px_0px_rgba(0,0,0,1)] uppercase transition-transform active:scale-95 flex items-center gap-2 ${
            canGoPrev
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black cursor-pointer'
              : 'bg-gray-700 text-gray-500 border-gray-800 cursor-not-allowed opacity-50'
          }`}
          title="Turn back to previous pages"
        >
          <span>◀</span> PREV
        </button>

        {/* Quick Page Indicator Pills */}
        <div className="hidden md:flex pointer-events-auto bg-black/80 backdrop-blur-sm border-2 border-yellow-400 px-3 py-1.5 gap-1.5 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          {Array.from({ length: totalSheets }).map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 border border-black transition-all ${
                idx === currentSheetIndex
                  ? 'bg-yellow-400 scale-125'
                  : idx < currentSheetIndex
                  ? 'bg-green-500'
                  : 'bg-gray-600'
              }`}
              title={`Sheet ${idx}`}
            />
          ))}
        </div>

        {/* Next Page Button */}
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={`pointer-events-auto comic-btn text-lg md:text-xl px-4 md:px-6 py-2.5 border-4 border-black shadow-[5px_5px_0px_rgba(0,0,0,1)] uppercase transition-transform active:scale-95 flex items-center gap-2 ${
            canGoNext
              ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer animate-pulse'
              : 'bg-gray-700 text-gray-500 border-gray-800 cursor-not-allowed opacity-50'
          }`}
          title={isNextLoading ? 'Next page is generating...' : 'Turn to next pages'}
        >
          {isNextLoading ? (
            <span>PRINTING... ⏳</span>
          ) : (
            <>
              NEXT <span>▶</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};
