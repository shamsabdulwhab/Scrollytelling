/**
 * INTRO = two full-screen slides before the form.
 *
 * Slide numbers are stored in App.tsx (introSlide). We only read them here.
 *   0 = title + coins
 *   1 = black stats screen (€1 vs €0.87)
 *
 * Props:
 *   slide          — which slide to show (0 or 1)
 *   onSlideChange  — tell App to change the slide (e.g. go to slide 1, or back to 0)
 *   onStart        — user finished intro → App should open the form
 */

import type { KeyboardEvent } from 'react'
import { BackArrowButton } from '../components/BackArrowButton'

/** Slide 0: main title. Slide 1: statistics screen. */
const SLIDE_TITLE = 0
const SLIDE_STATS = 1

export type IntroSceneProps = {
  slide: number
  onSlideChange: (slide: number) => void
  /** Called when the user is done with intro and should see the form */
  onStart: () => void
}

export function IntroScene({ slide, onSlideChange, onStart }: IntroSceneProps) {
  const showingStatsSlide = slide === SLIDE_STATS

  /**
   * One tap / click on the big area:
   * - on slide 0 → go to slide 1
   * - on slide 1 → go to the form (parent runs onStart)
   */
  function goToNextStep() {
    if (slide === SLIDE_TITLE) {
      onSlideChange(SLIDE_STATS)
    } else {
      onStart()
    }
  }

  /** Keyboard users: Enter or Space does the same as a click */
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      goToNextStep()
    }
  }

  function goBackToTitleSlide() {
    onSlideChange(SLIDE_TITLE)
  }

  return (
    <section
      className={`intro${showingStatsSlide ? ' intro--stats' : ''}`}
      onClick={goToNextStep}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={
        showingStatsSlide
          ? 'Gender pay gap statistics, click or press Enter to continue to the form'
          : 'The gender wage gap, click or press Enter for the next slide'
      }
    >
      {/*
        Back button: click must NOT bubble to the section (or it would "go forward" too).
        stopPropagation() = "only handle the click here, don't tell the parent section"
      */}
      {showingStatsSlide && (
        <div className="intro-stats-back" onClick={(e) => e.stopPropagation()}>
          <BackArrowButton onClick={goBackToTitleSlide} label="Back to previous slide" />
        </div>
      )}

      {/* Slide 0 — white background, coins, title */}
      {!showingStatsSlide && (
        <>
          <div className="intro-line" aria-hidden="true" />
          <div className="intro-coins" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span key={n} className={`intro-coin intro-coin--${n}`}>
                <img
                  className="intro-coin__img"
                  src={`${import.meta.env.BASE_URL}Eurosign.png`}
                  alt=""
                  draggable={false}
                />
              </span>
            ))}
          </div>
          <div className="intro-content">
            <h1 className="intro-title">
              <span className="intro-title__black">THE </span>
              <span className="intro-title__pink">GENDER WAGE </span>
              <span className="intro-title__black">GAP</span>
            </h1>
          </div>
        </>
      )}

      {/* Slide 1 — black background, big numbers */}
      {showingStatsSlide && (
        <div className="intro-stats">
          <div className="intro-stats__block">
            <p className="intro-stats__line intro-stats__line--hero">
              <span className="intro-stats__white">FOR EVERY </span>
              <span className="intro-stats__amount intro-stats__amount--hero">€1</span>
            </p>
            <p className="intro-stats__line intro-stats__line--block">A MAN EARNS...</p>
            <p className="intro-stats__line intro-stats__line--block">...A WOMAN</p>
            <p className="intro-stats__line intro-stats__line--hero">
              <span className="intro-stats__white">EARNS </span>
              <span className="intro-stats__amount intro-stats__amount--hero">€0.87</span>
            </p>
          </div>
          <p className="intro-stats__footnote">In 5 years, that&apos;s almost €30.000</p>
        </div>
      )}
    </section>
  )
}
