import TalkMachine from "../talk-to-me-core/js/TalkMachine.js";

export default class DialogMachine extends TalkMachine {
  constructor() {
    super();
    this.initDialogMachine();
  }

  initDialogMachine() {
    this.dialogStarted = false;
    this.lastState = "";
    this.nextState = "";
    this.waitingForUserInput = true;
    this.stateDisplay = document.querySelector("#state-display");
    this.shouldContinue = false;

    // initialiser les éléments de la machine de dialogue
    this.maxLeds = 30;
    this.ui.initLEDUI();

    // Registre des états des boutons - simple array: 0 = released, 1 = pressed
    this.buttonStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Mode de fonctionnement
    this.mode = "dialog"; // Changed from "led-stepper"

    // Array d'état des LEDs: 0 = black, 1 = white
    this.ledStates = new Array(this.maxLeds).fill(0);

    // Local LED states for each floor (0-9 for each floor)
    this.localLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Tracking for long-press dialog logic with button pairs
    this.currentGroundPair = null; // Tracks which pair (1, 2, or 3) is currently active
    this.lastGroundPair = null; // Tracks the last pair that completed a long press
    this.longPressThreshold = 1500;
    this.pairPressTimers = {}; // Tracks timers for each pair
    this.longPressTriggered = {}; // Tracks if long press already triggered for each pair

    this.finalSpeechPhase = 0; // 0=idle, 1=waiting after "Analyse...", 2=done
    this.finalMatchedLocation = null;

    this.speechQueue = [];
    this.speechQueueActive = false;
    this.ledFadeControllers = new Map();

    // Button pair definitions: pair 1 = buttons 1&2, pair 2 = buttons 3&4, pair 3 = buttons 5&6
    this.buttonPairs = {
      1: ["1", "2"], // Pair 1
      2: ["3", "4"], // Pair 2
      3: ["5", "6"], // Pair 3
    };

    // LED stepper initialization flags
    this.rainLedStepperInitialized = false;
    this.windLedStepperInitialized = false;
    this.hourLedStepperInitialized = false;
    this.pollutionLedStepperInitialized = false;
    this.temperatureLedStepperInitialized = false;

    // State-specific counters - track how many LEDs are lit in each mode
    this.rainCount = 0; // Number of white LEDs in choose-rain
    this.windCount = 0; // Number of white LEDs in choose-wind
    this.hourCount = 0; // Number of white LEDs in choose-hour
    this.pollutionCount = 0; // Number of white LEDs in choose-pollution
    this.temperatureCount = 0; // Number of white LEDs in choose-temperature

    // State-specific LED states - preserve LED patterns for each mode
    this.rainLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.windLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.hourLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.pollutionLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.temperatureLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Button 0 press tracking for summary state
    this.button0PressCount = 0;
    this.button0FirstPressTime = null;
    this.button0MaxDuration = 3000; // 3 seconds max to press 4 times

    this.rainDescriptions = [
      "un temps sec",
      "une faible bruine",
      "une faible pluie",
      "une pluie modérée",
      "une forte pluie",
      "une pluie intense",
      "un faible orage",
      "une orage moderé",
      "un orage violent",
      "un déluge",
    ];

    this.windDescriptions = [
      "un calme plat",
      "une legère brise",
      "une bonne brise",
      "un vent modéré",
      "un vent fort",
      "un vent violent",
      "une tempête modérée",
      "une tempête intense",
      "une tempête dévastatrice",
      "un ouragan",
    ];

    this.hourDescriptions = [
      "minuit",
      "deux heures du matin",
      "cinq heures du matin",
      "sept heures du matin",
      "neuf heures trente du matin",
      "midi",
      "quatorze heure trente",
      "dix-sept heure",
      "dix-neuf heure",
      "vingt-et-une heure trente",
    ];

    this.pollutionDescriptions = [
      "un air pur",
      "un air excellent",
      "un air de bonne qualité",
      "un air acceptable",
      "un air médiocre",
      "un air dégradé",
      "un air mauvais",
      "un air très mauvais",
      "un air extrêmement mauvais",
      "un air dangereux",
    ];

    this.temperatureDescriptions = [
      "un froid glacial",
      "un froid intense",
      "un grand froid",
      "un temps froid",
      "un temps frais",
      "un temps doux",
      "un temps agréable",
      "un temps chaud",
      "une forte chaleur",
      "une chaleur extrême",
    ];

    this.rainColors = [
      [85, 211, 255],
      [70, 188, 242],
      [60, 164, 229],
      [50, 141, 216],
      [45, 117, 203],
      [30, 94, 190],
      [20, 70, 177],
      [10, 47, 164],
      [7, 23, 151],
      [1, 5, 50],
    ];
    this.hourColors = [
      [3, 6, 45],
      [85, 25, 175],
      [222, 44, 44],
      [255, 101, 33],
      [255, 120, 60],
      [255, 120, 60],
      [255, 101, 33],
      [222, 44, 44],
      [85, 25, 175],
      [3, 6, 45],
    ];

    this.pollutionColors = [
      [245, 245, 245],
      [200, 199, 196],
      [150, 148, 142],
      [110, 105, 95],
      [80, 72, 55],
      [55, 48, 32],
      [35, 30, 18],
      [20, 17, 9],
      [12, 10, 5],
      [6, 5, 2],
    ];
    this.temperatureColors = [
      [0, 20, 120],
      [0, 60, 180],
      [0, 100, 220],
      [40, 140, 220],
      [80, 170, 200],
      [140, 185, 140],
      [200, 180, 90],
      [255, 140, 50],
      [255, 90, 40],
      [200, 30, 20],
    ];

    // Case audio engine
    this._initCaseAudioEngine();
  }

  /**
   * Get the current LED array mapping based on currentGroundPair
   * Maps local indices 0-9 to physical LED indices based on floor
   * Floor 1 (pair 1): LEDs 0-9
   * Floor 2 (pair 2): LEDs 10-19
   * Floor 3 (pair 3): LEDs 20-29
   * @returns {Array<number>} Array of 10 physical LED indices
   */
  getCurrentLedArray() {
    const ledMapping = {
      1: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29], // Pair 1 (buttons 1&2): LEDs 0-9
      2: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Pair 2 (buttons 3&4): LEDs 10-19
      3: [19, 18, 17, 16, 15, 14, 13, 12, 11, 10], // Pair 3 (buttons 5&6): LEDs 20-29
    };

    // Default to floor 1 if no ground pair is set
    return ledMapping[this.currentGroundPair] || ledMapping["1"];
  }

  async animateGroundActivation(pairNumber) {
    const ledMapping = {
      1: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
      2: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      3: [19, 18, 17, 16, 15, 14, 13, 12, 11, 10],
    };

    const ledArray = ledMapping[pairNumber];
    if (!ledArray) return;

    const stepDelayMs = 80;
    const fadeInMs = 80;
    const fadeOutMs = 80;
    const holdMs = 90;
    const onColor = [255, 255, 255];
    const offColor = [0, 0, 0];
    const localCenterOutPairs = [
      [4, 5],
      [3, 6],
      [2, 7],
      [1, 8],
      [0, 9],
    ];
    const orderedLeds = localCenterOutPairs.flatMap((pair) =>
      pair.map((localIndex) => ledArray[localIndex]),
    );

    orderedLeds.forEach((idx) => this.ledChangeRGB(idx, 0, 0, 0));

    for (let i = 0; i < localCenterOutPairs.length; i++) {
      const [leftLocal, rightLocal] = localCenterOutPairs[i];
      const leftIdx = ledArray[leftLocal];
      const rightIdx = ledArray[rightLocal];

      this._fadeLedRGB(leftIdx, offColor, onColor, fadeInMs);
      this._fadeLedRGB(rightIdx, offColor, onColor, fadeInMs);
      await new Promise((resolve) => setTimeout(resolve, stepDelayMs));
    }

    await new Promise((resolve) => setTimeout(resolve, holdMs));

    await Promise.all(
      orderedLeds.map((idx) =>
        this._fadeLedRGB(idx, onColor, offColor, fadeOutMs),
      ),
    );

    orderedLeds.forEach((idx) => this.ledChangeRGB(idx, 0, 0, 0));
  }

  _isSelectionState(state = this.nextState) {
    return (
      state === "choose-rain" ||
      state === "choose-wind" ||
      state === "choose-hour" ||
      state === "choose-pollution" ||
      state === "choose-temperature"
    );
  }

  async animateAllLedsLoading(times = 3) {
    const stepDelayMs = 35;
    const tailOffMs = 120;

    for (let t = 0; t < times; t++) {
      this._allLedsOff();

      for (let i = 0; i < this.maxLeds; i++) {
        this._allLedsOff();
        this.ledChangeRGB(i, 255, 255, 255);
        await new Promise((resolve) => setTimeout(resolve, stepDelayMs));
      }

      await new Promise((resolve) => setTimeout(resolve, tailOffMs));
    }

    this._allLedsOff();
  }

  async animateGroundArraysLoading(times = 3) {
    const stepDelayMs = 80;
    const cycleDelayMs = 200;

    const ground1 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
    const ground2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const ground3 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

    for (let t = 0; t < times; t++) {
      this._allLedsOff();

      for (let i = 0; i < 10; i++) {
        this.ledChangeRGB(ground2[i], 255, 255, 255);
        this.ledChangeRGB(ground3[9 - i], 255, 255, 255);
        this.ledChangeRGB(ground1[i], 255, 255, 255);

        await new Promise((resolve) => setTimeout(resolve, stepDelayMs));
      }

      await new Promise((resolve) => setTimeout(resolve, cycleDelayMs));
    }

    this._allLedsOff();
  }

  /**
   * Light up a LED at a local index (0-9) which maps to the correct physical LED
   * based on the current ground pair
   * @param {number} localIndex - Local LED index (0-9)
   * @param {number} r - Red value (0-255)
   * @param {number} g - Green value (0-255)
   * @param {number} b - Blue value (0-255)
   */
  lightUpLocalLed(localIndex, r = 255, g = 255, b = 255) {
    if (localIndex < 0 || localIndex > 9) {
      this.fancyLogger.logWarning(
        `Invalid local LED index: ${localIndex}. Must be 0-9.`,
      );
      return;
    }

    const currentLedArray = this.getCurrentLedArray();
    const physicalLedIndex = currentLedArray[localIndex];

    this.fancyLogger.logMessage(
      `Lighting local LED ${localIndex} → physical LED ${physicalLedIndex} (floor ${this.currentGroundPair})`,
    );

    this.ledChangeRGB(physicalLedIndex, r, g, b);
  }

  /**
   * Turn off all LEDs in the current floor range
   */
  turnOffCurrentFloorLeds() {
    const currentLedArray = this.getCurrentLedArray();
    currentLedArray.forEach((physicalIndex) => {
      this.ledChangeRGB(physicalIndex, 0, 0, 0);
    });
  }

  /**
   * Local LED stepper: works with indices 0-9 for the current floor
   * Action "+" : first black -> white
   * Action "-" : last white -> black
   * Also updates the state-specific counter (rainCount, windCount, etc.)
   * @param {string} action - "+" or "-"
   * @private
   */
  _handleLocalLedStepper(action) {
    if (action === "+") {
      // Find first black LED in local array (0-9)
      const localIdx = this.localLedStates.findIndex((s) => s === 0);
      if (localIdx === -1) return;

      this.localLedStates[localIdx] = 1;
      const [r, g, b] = this._getColorForState(localIdx);
      this.lightUpLocalLed(localIdx, r, g, b);

      this._updateStateCounter("+");

      if (this.nextState !== "choose-temperature") {
        this._syncCaseAudioWithCurrentLed();
      }

      this.fancyLogger.logMessage(
        `LED Stepper +: Local LED ${localIdx} turned ON with color [${r}, ${g}, ${b}]`,
      );
      return;
    }

    if (action === "-") {
      // Find last white LED in local array (0-9)
      const localIdx = this.localLedStates.lastIndexOf(1);
      if (localIdx === -1) return; // All LEDs are already black

      // Turn off this local LED
      this.localLedStates[localIdx] = 0;
      this.lightUpLocalLed(localIdx, 0, 0, 0); // Black

      // Update the appropriate counter based on current state
      this._updateStateCounter("-");

      if (this.nextState !== "choose-temperature") {
        this._syncCaseAudioWithCurrentLed();
      }

      this.fancyLogger.logMessage(
        `LED Stepper -: Local LED ${localIdx} turned OFF`,
      );
      console.log(`[local-led-stepper] action=${action} localLedStates=`, [
        ...this.localLedStates,
      ]);
    }
  }

  _getColorForState(localIdx) {
    if (this.nextState === "choose-wind") return [255, 255, 255];
    if (this.nextState === "choose-rain") {
      return this.rainColors[localIdx] || [255, 255, 255];
    }
    if (this.nextState === "choose-hour") {
      return this.hourColors[localIdx] || [255, 255, 255];
    }
    if (this.nextState === "choose-pollution") {
      return this.pollutionColors[localIdx] || [255, 255, 255];
    }
    if (this.nextState === "choose-temperature") {
      return this.temperatureColors[localIdx] || [255, 255, 255];
    }
    return [255, 255, 255];
  }

  _resetCurrentStateLedMemory() {
    const empty = new Array(10).fill(0);

    if (this.nextState === "choose-rain") {
      this.rainLedStates = [...empty];
    } else if (this.nextState === "choose-wind") {
      this.windLedStates = [...empty];
    } else if (this.nextState === "choose-hour") {
      this.hourLedStates = [...empty];
    } else if (this.nextState === "choose-pollution") {
      this.pollutionLedStates = [...empty];
    } else if (this.nextState === "choose-temperature") {
      this.temperatureLedStates = [...empty];
    }
  }

  _fadeLedRGB(physicalIndex, fromRGB, toRGB, durationMs = 250) {
    return new Promise((resolve) => {
      const previousController = this.ledFadeControllers.get(physicalIndex);
      if (previousController) {
        previousController.cancelled = true;
        if (previousController.rafId) {
          cancelAnimationFrame(previousController.rafId);
        }
      }

      const controller = { cancelled: false, rafId: null };
      this.ledFadeControllers.set(physicalIndex, controller);

      const start = performance.now();

      const tick = (now) => {
        if (controller.cancelled) {
          resolve();
          return;
        }

        const t = Math.min(1, (now - start) / durationMs);
        const eased = t * t * (3 - 2 * t);

        const r = Math.round(fromRGB[0] + (toRGB[0] - fromRGB[0]) * eased);
        const g = Math.round(fromRGB[1] + (toRGB[1] - fromRGB[1]) * eased);
        const b = Math.round(fromRGB[2] + (toRGB[2] - fromRGB[2]) * eased);

        this.ledChangeRGB(physicalIndex, r, g, b);

        if (t < 1) {
          controller.rafId = requestAnimationFrame(tick);
        } else {
          if (this.ledFadeControllers.get(physicalIndex) === controller) {
            this.ledFadeControllers.delete(physicalIndex);
          }
          resolve();
        }
      };

      controller.rafId = requestAnimationFrame(tick);
    });
  }

  _allLedsWhite() {
    for (let i = 0; i < this.maxLeds; i++) {
      this.ledChangeRGB(i, 255, 255, 255);
    }
  }

  _allLedsOff() {
    for (let i = 0; i < this.maxLeds; i++) {
      this.ledChangeRGB(i, 0, 0, 0);
    }
  }

  /**
   * Update the state-specific counter based on the current state
   * @param {string} action - "+" to increment, "-" to decrement
   * @private
   */
  _updateStateCounter(action) {
    const increment = action === "+" ? 1 : -1;

    if (this.nextState === "choose-rain") {
      this.rainCount += increment;
      this.rainCount = Math.max(0, Math.min(10, this.rainCount));
      this.fancyLogger.logMessage(`Rain Count: ${this.rainCount}/10`);
    } else if (this.nextState === "choose-wind") {
      this.windCount += increment;
      this.windCount = Math.max(0, Math.min(10, this.windCount));
      this.fancyLogger.logMessage(`Wind Count: ${this.windCount}/10`);
    } else if (this.nextState === "choose-hour") {
      this.hourCount += increment;
      this.hourCount = Math.max(0, Math.min(10, this.hourCount));
      this.fancyLogger.logMessage(`Hour Count: ${this.hourCount}/10`);
    } else if (this.nextState === "choose-pollution") {
      this.pollutionCount += increment;
      this.pollutionCount = Math.max(0, Math.min(10, this.pollutionCount));
      this.fancyLogger.logMessage(`Pollution Count: ${this.pollutionCount}/10`);
    } else if (this.nextState === "choose-temperature") {
      this.temperatureCount += increment;
      this.temperatureCount = Math.max(0, Math.min(10, this.temperatureCount));
      this.fancyLogger.logMessage(
        `Temperature Count: ${this.temperatureCount}/10`,
      );
    }
  }

  /**
   * Save current LED states to the appropriate state-specific array
   * @private
   */
  _saveCurrentStateLedStates() {
    if (this.nextState === "choose-rain") {
      this.rainLedStates = [...this.localLedStates];
    } else if (this.nextState === "choose-wind") {
      this.windLedStates = [...this.localLedStates];
    } else if (this.nextState === "choose-hour") {
      this.hourLedStates = [...this.localLedStates];
    } else if (this.nextState === "choose-pollution") {
      this.pollutionLedStates = [...this.localLedStates];
    } else if (this.nextState === "choose-temperature") {
      this.temperatureLedStates = [...this.localLedStates];
    }
  }

  /**
   * Restore LED states from the appropriate state-specific array
   * @param {string} targetState - The state to restore LEDs for
   * @private
   */
  _restoreStateLedStates(targetState) {
    let savedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    if (targetState === "choose-rain") {
      savedStates = [...this.rainLedStates];
    } else if (targetState === "choose-wind") {
      savedStates = [...this.windLedStates];
    } else if (targetState === "choose-hour") {
      savedStates = [...this.hourLedStates];
    } else if (targetState === "choose-pollution") {
      savedStates = [...this.pollutionLedStates];
    } else if (targetState === "choose-temperature") {
      savedStates = [...this.temperatureLedStates];
    }

    // Apply the saved states to localLedStates and render them
    this.localLedStates = [...savedStates];

    // Render all LEDs based on saved state
    for (let i = 0; i < this.localLedStates.length; i++) {
      if (this.localLedStates[i] === 1) {
        const [r, g, b] = this._getColorForState(i);
        this.lightUpLocalLed(i, r, g, b);
      } else {
        this.lightUpLocalLed(i, 0, 0, 0);
      }
    }
  }

  _initCaseAudioEngine() {
    const createTrack = (src, leds, gain = 1) => ({
      src,
      leds,
      gain,
      element: new Audio(src),
    });

    this.caseAudio = {
      currentMode: null,
      minVolume: 0.2,
      fadeDurationMs: 180,
      duckingFactor: 1,
      speechDuckingFactor: 0.45,
      persistentSelections: {},
      modes: {
        rain: [
          createTrack("audio/01-rain/1-4-rain.mp3", [0, 1, 2, 3]),
          createTrack("audio/01-rain/5-8-rain.mp3", [4, 5, 6, 7]),
          createTrack("audio/01-rain/9-rain.mp3", [8]),
          createTrack("audio/01-rain/10-rain.mp3", [9]),
        ],
        wind: [
          createTrack("audio/02-wind/1-3-wind.mp3", [0, 1, 2]),
          createTrack("audio/02-wind/4-wind.mp3", [3]),
          createTrack("audio/02-wind/5-6-wind.mp3", [4, 5]),
          createTrack("audio/02-wind/7-9-wind.mp3", [6, 7, 8, 9]),
        ],
        hour: [
          createTrack("audio/03-hour/1-wolf.mp3", [0]),
          createTrack("audio/03-hour/2-owl.mp3", [1]),
          createTrack("audio/03-hour/3-poulet.mp3", [2]),
          createTrack("audio/03-hour/4-dog.mp3", [3]),
          createTrack("audio/03-hour/5-cow.mp3", [4]),
          createTrack("audio/03-hour/6-horse.mp3", [5]),
          createTrack("audio/03-hour/7-cigale.mp3", [6]),
          createTrack("audio/03-hour/8-sheep.mp3", [7]),
          createTrack("audio/03-hour/9-cat.mp3", [8]),
          createTrack("audio/03-hour/10-frog.mp3", [9]),
        ],
        pollution: [
          createTrack("audio/04-pollution/1-2-pollution.mp3", [0, 1]),
          createTrack("audio/04-pollution/3-pollution.mp3", [2]),
          createTrack("audio/04-pollution/4-pollution.mp3", [3]),
          createTrack("audio/04-pollution/5-pollution.mp3", [4]),
          createTrack("audio/04-pollution/6-pollution.mp3", [5]),
          createTrack("audio/04-pollution/7-pollution.mp3", [6]),
          createTrack("audio/04-pollution/8-pollution.mp3", [7], 0.2),
          createTrack("audio/04-pollution/9-10-pollution.mp3", [8, 9], 17),
        ],
      },
    };

    Object.values(this.caseAudio.modes)
      .flat()
      .forEach((track) => {
        track.element.loop = true;
        track.element.volume = 0;
        track.element.preload = "auto";
      });
  }

  _setTrackVolume(track, volume) {
    track.element.volume = Math.max(0, Math.min(1, volume));
  }

  _cancelTrackFade(track) {
    if (track.fadeRafId) {
      cancelAnimationFrame(track.fadeRafId);
      track.fadeRafId = null;
    }
  }

  _fadeTrackToVolume(
    track,
    targetVolume,
    durationMs = this.caseAudio.fadeDurationMs,
  ) {
    const duckedTarget = targetVolume * (this.caseAudio?.duckingFactor ?? 1);
    const trackGain = track?.gain ?? 1;
    const target = Math.max(0, Math.min(1, duckedTarget * trackGain));
    const start = track.element.volume;

    if (Math.abs(start - target) < 0.01 || durationMs <= 0) {
      this._setTrackVolume(track, target);
      return;
    }

    this._cancelTrackFade(track);

    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const nextVolume = start + (target - start) * progress;
      this._setTrackVolume(track, nextVolume);

      if (progress < 1) {
        track.fadeRafId = requestAnimationFrame(step);
      } else {
        track.fadeRafId = null;
      }
    };

    track.fadeRafId = requestAnimationFrame(step);
  }

  _playTrackIfNeeded(track) {
    if (!track.element.paused) return;
    track.element.play().catch(() => {
      // Browser autoplay policy can block until user interaction
    });
  }

  _pauseTrack(track) {
    this._cancelTrackFade(track);
    track.element.pause();
    track.element.currentTime = 0;
    this._setTrackVolume(track, 0);
  }

  _activateCaseAudioMode(modeKey) {
    if (!this.caseAudio) return;

    if (!modeKey) {
      this._stopAllCaseAudio();
      return;
    }

    const tracks = this.caseAudio.modes[modeKey] || [];
    tracks.forEach((track) => {
      this._setTrackVolume(track, 0);
      this._playTrackIfNeeded(track);
    });

    this.caseAudio.currentMode = modeKey;
    this._syncCaseAudioWithCurrentLed();
  }

  _stopAllCaseAudio() {
    if (!this.caseAudio) return;

    Object.values(this.caseAudio.modes)
      .flat()
      .forEach((track) => this._pauseTrack(track));

    this.caseAudio.currentMode = null;
    this.caseAudio.persistentSelections = {};
  }

  _getLedVolumeWithinTrack(position, trackLength) {
    if (trackLength <= 1) return 1;
    const step = (1 - this.caseAudio.minVolume) / (trackLength - 1);
    return this.caseAudio.minVolume + position * step;
  }

  _syncCaseAudioWithCurrentLed() {
    if (!this.caseAudio || !this.caseAudio.currentMode) return;

    const currentModeTracks =
      this.caseAudio.modes[this.caseAudio.currentMode] || [];
    const allTracks = Object.values(this.caseAudio.modes).flat();
    const activeLocalLed = this.localLedStates.lastIndexOf(1);

    let activeTrack = null;
    let activeTrackVolume = 0;

    if (activeLocalLed !== -1) {
      activeTrack = currentModeTracks.find((track) =>
        track.leds.includes(activeLocalLed),
      );

      if (activeTrack) {
        const ledPosition = activeTrack.leds.indexOf(activeLocalLed);
        activeTrackVolume = this._getLedVolumeWithinTrack(
          ledPosition,
          activeTrack.leds.length,
        );
      }
    }

    if (activeTrack) {
      this.caseAudio.persistentSelections[this.caseAudio.currentMode] = {
        track: activeTrack,
        volume: activeTrackVolume,
      };
    } else {
      delete this.caseAudio.persistentSelections[this.caseAudio.currentMode];
    }

    const targetByTrack = new Map();

    Object.entries(this.caseAudio.persistentSelections).forEach(
      ([modeKey, selection]) => {
        if (modeKey !== this.caseAudio.currentMode && selection?.track) {
          targetByTrack.set(selection.track, selection.volume);
        }
      },
    );

    currentModeTracks.forEach((track) => {
      const target = track === activeTrack ? activeTrackVolume : 0;
      targetByTrack.set(track, target);
    });

    allTracks.forEach((track) => {
      const target = targetByTrack.get(track) || 0;
      const isCurrentModeTrack = currentModeTracks.includes(track);

      if (isCurrentModeTrack || target > 0) {
        this._playTrackIfNeeded(track);
      }

      this._fadeTrackToVolume(track, target);
    });
  }

  _setCaseAudioDucking(enabled) {
    if (!this.caseAudio) return;

    const nextFactor = enabled ? this.caseAudio.speechDuckingFactor : 1;
    if (this.caseAudio.duckingFactor === nextFactor) return;

    this.caseAudio.duckingFactor = nextFactor;
    this._syncCaseAudioWithCurrentLed();
  }

  /* CONTRÔLE DU DIALOGUE */
  startDialog() {
    this.dialogStarted = true;
    this.waitingForUserInput = true;

    this._stopAllCaseAudio();

    // éteindre toutes les LEDs (black)
    this.ledsAllOff();

    // effacer la console
    this.fancyLogger.clearConsole();

    // Reset des états LEDs
    this.ledStates.fill(0);
    this.localLedStates.fill(0);
    this._renderAllLedsFromState();

    // Reset ground pair tracking
    this.currentGroundPair = null;
    this.lastGroundPair = null;
    this.rainLedStepperInitialized = false;
    this.windLedStepperInitialized = false;
    this.hourLedStepperInitialized = false;
    this.pollutionLedStepperInitialized = false;
    this.temperatureLedStepperInitialized = false;

    // Reset state-specific counters
    this.rainCount = 0;
    this.windCount = 0;
    this.hourCount = 0;
    this.pollutionCount = 0;
    this.temperatureCount = 0;

    this.rainLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.windLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.hourLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.pollutionLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.temperatureLedStates = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.finalSpeechPhase = 0;
    this.finalMatchedLocation = null;
    this.speechQueue = [];
    this.speechQueueActive = false;

    this.fancyLogger.logMessage(
      "Dialog started: Long-press button pairs (1&2, 3&4, or 5&6) to begin...",
    );

    // Start with initialisation state
    this.nextState = "initialisation";
    this.dialogFlow();
  }

  /* FLUX DU DIALOGUE */
  /**
   * Fonction principale du flux de dialogue
   * @param {string} eventType - Type d'événement ('default', 'pressed', 'released', 'longpress')
   * @param {number} button - Numéro du bouton (0-9)
   * @private
   */
  dialogFlow(eventType = "default", button = -1) {
    if (!this.performPreliminaryTests()) {
      // premiers tests avant de continuer vers les règles
      return;
    }
    this.stateUpdate();

    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * Flow du DIALOGUE - Guide visuel du flux de conversation
     * ═══════════════════════════════════════════════════════════════════════════
     *
     * initialisation → welcome → choose-color ─┬→ choose-blue → can-speak → count-press → toomuch → enough-pressed
     *                                           │
     *                                           └→ choose-yellow ──┘ (boucle vers choose-color)
     *
     * CONCEPTS CLÉS DE DIALOGUE DÉMONTRÉS:
     * ✓ Progression linéaire: États qui s'enchaînent (initialisation → welcome)
     * ✓ Embranchement: Le choix de l'utilisateur crée différents chemins (choose-color se divise selon le bouton)
     * ✓ Boucles: La conversation peut retourner à des états précédents (choose-yellow boucle)
     * ✓ Mémoire d'état: Le système se souvient des interactions précédentes (buttonPressCounter)
     * ✓ Initiative système: La machine parle sans attendre d'entrée (can-speak)
     *
     * MODIFIEZ LE DIALOGUE CI-DESSOUS - Ajoutez de nouveaux états dans le switch/case
     * ═══════════════════════════════════════════════════════════════════════════
     */

    switch (this.nextState) {
      case "initialisation":
        // CONCEPT DE DIALOGUE: État de configuration - prépare le système avant l'interaction
        this.ledsAllOff();
        this.nextState = "waiting-for-ground"; // Wait for button pairs 1&2, 3&4, or 5&6
        this.fancyLogger.logMessage(
          "initialisation done - waiting for long press on button pairs (1&2, 3&4, or 5&6)",
        );
        this.waitingForUserInput = true;
        break;

      case "waiting-for-ground":
        // This state is waiting for a long press on button pairs 1&2, 3&4, or 5&6
        // The logic is handled in _handleButtonLongPressedImmediate
        this.fancyLogger.logMessage(
          "Waiting for long press on button pairs (1&2, 3&4, or 5&6)...",
        );
        break;

      case "welcome":
        // CONCEPT: First ground pair was long-pressed
        this.fancyLogger.logMessage(
          `Welcome! Pair ${this.currentGroundPair} long-pressed`,
        );
        this.speakSequence(
          [
            "Bonjour et bienvenue ! Vous êtes en direct avec Caelum, votre studio météo personnel.",
            "Pour composer votre météo idéale utilisez les boutons plus et moins pour ajuster l’intensité de chaque paramètres météo et tournez Caelum pour passer au suivant.",
          ],
          { continueToNextState: true },
        );
        this.nextState = "choose-rain";
        break;

      case "choose-rain":
        // CONCEPT: User is in "rain" mode with current button held
        this._activateCaseAudioMode("rain");
        this.fancyLogger.logMessage(
          `Choose rain mode - current button: ${this.currentGroundButton}`,
        );
        this.speakNormal(`Choisissez l'intensité de pluie souhaitée!`);

        // Initialize LED stepper for this floor if first time entering
        if (!this.rainLedStepperInitialized) {
          this.turnOffCurrentFloorLeds();
          this.rainLedStepperInitialized = true;
          console.log(this.nextState);
        }

        // Stay in this state until button is released AND another ground button is long-pressed
        // LED stepper is handled in _handleButtonPressed for buttons 0 and 1
        this.waitingForUserInput = true;
        break;

      case "choose-wind":
        // CONCEPT: User switched to another ground button
        this._activateCaseAudioMode("wind");
        this.fancyLogger.logMessage(
          `Switched to wind mode - new button: ${this.currentGroundButton}`,
        );
        this.speakNormal(
          `Vous avez choisi ${this.rainDescriptions[this.rainCount]}. Choisissez maintenant l'intensité du vent!`,
        );

        // Initialize LED stepper for this floor if first time entering
        if (!this.windLedStepperInitialized) {
          this.turnOffCurrentFloorLeds();
          this.windLedStepperInitialized = true;
        }

        // LED stepper is handled in _handleButtonPressed for buttons 0 and 1
        this.waitingForUserInput = true;
        break;

      case "choose-hour":
        // CONCEPT: User switched to hour mode
        this._activateCaseAudioMode("hour");
        this.fancyLogger.logMessage(
          `Switched to hour mode - new button: ${this.currentGroundButton}`,
        );
        this.speakNormal(
          `Vous avez choisi ${this.windDescriptions[this.windCount]}. Choisissez maintenant le moment de la journée!`,
        );

        // Initialize LED stepper for this floor if first time entering
        if (!this.hourLedStepperInitialized) {
          this.turnOffCurrentFloorLeds();
          this.hourLedStepperInitialized = true;
        }

        // LED stepper is handled in _handleButtonPressed for buttons 0 and 1
        this.waitingForUserInput = true;
        break;

      case "choose-pollution":
        // CONCEPT: User switched to pollution mode
        this._activateCaseAudioMode("pollution");
        this.fancyLogger.logMessage(
          `Switched to pollution mode - new button: ${this.currentGroundButton}`,
        );
        this.speakNormal(
          `Vous avez choisi ${this.hourDescriptions[this.hourCount]}. Choisissez maintenant la qualité de l'air!`,
        );

        // Initialize LED stepper for this floor if first time entering
        if (!this.pollutionLedStepperInitialized) {
          this.turnOffCurrentFloorLeds();
          this.pollutionLedStepperInitialized = true;
        }

        this.waitingForUserInput = true;
        break;

      case "choose-temperature":
        // CONCEPT: User switched to temperature mode
        this.fancyLogger.logMessage(
          `Switched to temperature mode - new button: ${this.currentGroundButton}`,
        );
        this.speakNormal(
          `Vous avez choisi ${this.pollutionDescriptions[this.pollutionCount]}. Choisissez maintenant votre temperature idéale!`,
        );

        // Initialize LED stepper for this floor if first time entering
        if (!this.temperatureLedStepperInitialized) {
          this.turnOffCurrentFloorLeds();
          this.temperatureLedStepperInitialized = true;
        }

        this.waitingForUserInput = true;
        break;

      case "summary":
        // CONCEPT: Display all collected parameters and wait for 4 presses of button 0
        this.fancyLogger.logMessage("═══════════════════════════════════");
        this.fancyLogger.logMessage("SUMMARY OF YOUR SELECTIONS:");
        this.fancyLogger.logMessage(`Rain Count: ${this.rainCount}/10`);
        this.fancyLogger.logMessage(`Wind Count: ${this.windCount}/10`);
        this.fancyLogger.logMessage(`Hour Count: ${this.hourCount}/10`);
        this.fancyLogger.logMessage(
          `Pollution Count: ${this.pollutionCount}/10`,
        );
        this.fancyLogger.logMessage(
          `Temperature Count: ${this.temperatureCount}/10`,
        );
        this.fancyLogger.logMessage("═══════════════════════════════════");
        this.fancyLogger.logMessage(
          "Press button 0 FOUR times within 3 seconds to continue...",
        );

        this.speakNormal(
          "Vos conditions météorologiques idéales sont assemblées. Vous pouvez à présent profiter de votre ambiance customisée. Pour découvrir où cette météo est disponible… secouez Caelum.",
        );

        // Reset button 0 press tracking
        this.button0PressCount = 0;
        this.button0FirstPressTime = null;

        this.waitingForUserInput = true;
        break;

      case "final":
        // CONCEPT: Final state after successful button 0 sequence
        this.fancyLogger.logMessage("═══════════════════════════════════");
        this.fancyLogger.logMessage("🎉 CONGRATULATIONS! 🎉");
        this.fancyLogger.logMessage("You have completed the dialog!");
        this.fancyLogger.logMessage("═══════════════════════════════════");

        const pairNumber = this.currentGroundPair;
        if (pairNumber !== null) {
          (async () => {
            await this.animateGroundActivation(pairNumber);
            await this.animateGroundActivation(pairNumber);
            await this.animateGroundActivation(pairNumber);
          })();
        }

        this.finalMatchedLocation = this.findClosestLocation();
        this.finalSpeechPhase = 1;
        this.speakNormal("Analyse des conditions en cours…");

        this.waitingForUserInput = false;
        break;

      default:
        this.fancyLogger.logWarning(
          `Sorry but State: "${this.nextState}" has no case defined`,
        );
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * Autres fonctions
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   *  fonction shorthand pour dire un texte avec la voix prédéfinie
   *  @param {string} _text le texte à dire
   */
  speakNormal(_text) {
    // appelé pour dire un texte
    this._setCaseAudioDucking(true);
    this.speechText(_text, [186, 0.9, 0.8]);
  }

  speakSequence(lines, { continueToNextState = false } = {}) {
    const list = Array.isArray(lines) ? lines : [String(lines)];
    this.speechQueue = list.filter(Boolean);

    if (this.speechQueue.length === 0) {
      if (continueToNextState) this.goToNextState();
      return;
    }

    this.speechQueueActive = true;
    this.shouldContinue = continueToNextState;
    this.speakNormal(this.speechQueue.shift());
  }

  /**
   *  fonction shorthand pour forcer la transition vers l'état suivant dans le flux de dialogue
   *  @param {number} delay - le délai optionnel en millisecondes
   * @private
   */
  goToNextState(delay = 0) {
    if (delay > 0) {
      setTimeout(() => {
        this.dialogFlow();
      }, delay);
    } else {
      this.dialogFlow();
    }
  }

  /**
   * Effectuer des tests préliminaires avant de continuer avec le flux de dialogue
   * @returns {boolean} true si tous les tests passent, false sinon
   * @private
   */
  performPreliminaryTests() {
    if (this.dialogStarted === false) {
      this.fancyLogger.logWarning("not started yet, press Start Machine");
      return false;
    }
    if (this.waitingForUserInput === false) {
      this._handleUserInputError();
      return false;
    }
    // vérifier qu'aucune parole n'est active
    if (this.speechIsSpeaking === true) {
      this.fancyLogger.logWarning(
        "im speaking, please wait until i am finished",
      );
      return false;
    }
    if (
      this.nextState === "" ||
      this.nextState === null ||
      this.nextState === undefined
    ) {
      this.fancyLogger.logWarning("nextState is empty or undefined");
      return false;
    }

    return true;
  }

  stateUpdate() {
    this.lastState = this.nextState;
    // Mettre à jour l'affichage de l'état
    if (this.stateDisplay) {
      this.stateDisplay.textContent = this.nextState;
    }
  }

  /**
   * Met à jour physiquement une LED depuis ledStates (0=black, 1=white)
   * @param {number} index
   * @private
   */
  _renderLedFromState(index) {
    const v = this.ledStates[index] === 1 ? 255 : 0;
    this.ledChangeRGB(index, v, v, v);
  }

  /**
   * Re-rend toutes les LEDs depuis ledStates
   * @private
   */
  _renderAllLedsFromState() {
    for (let i = 0; i < this.maxLeds; i++) {
      this._renderLedFromState(i);
    }
  }

  /**
   * Bouton 0 = + : premier black -> white
   * Bouton 1 = - : dernier white -> black
   * @param {number} button
   * @private
   */
  _handleLedStepper(button) {
    // Normalisation: si le système envoie 1..10, on convertit en 0..9
    const b = button;

    if (b === "0") {
      const idx = this.ledStates.findIndex((s) => s === 0);
      if (idx === -1) return;
      this.ledStates[idx] = 1;
      this._renderLedFromState(idx);
      return;
    }

    if (b === "1") {
      const idx = this.ledStates.lastIndexOf(1);
      if (idx === -1) return;
      this.ledStates[idx] = 0;
      this._renderLedFromState(idx);
      console.log(`[led-stepper] button=${button} ledStates=`, [
        ...this.ledStates,
      ]);
    }
  }

  /**
   * Check if both buttons in a pair are currently pressed
   * @param {number} pairNumber - The pair number (1, 2, or 3)
   * @returns {boolean} True if both buttons in the pair are pressed
   * @private
   */
  _areBothButtonsInPairPressed(pairNumber) {
    const pair = this.buttonPairs[pairNumber];
    if (!pair) return false;

    const [button1, button2] = pair;
    return this.buttonStates[button1] === 1 && this.buttonStates[button2] === 1;
  }

  /**
   * Get which pair a button belongs to
   * @param {string} button - The button number as string
   * @returns {number|null} The pair number (1, 2, or 3) or null if not in a pair
   * @private
   */
  _getButtonPair(button) {
    for (const [pairNum, buttons] of Object.entries(this.buttonPairs)) {
      if (buttons.includes(button)) {
        return parseInt(pairNum);
      }
    }
    return null;
  }

  _handleButtonPressed(button, simulated = false) {
    this.buttonStates[button] = 1;

    if (
      this.caseAudio?.currentMode &&
      this.nextState !== "choose-temperature"
    ) {
      this._syncCaseAudioWithCurrentLed();
    }

    // DEBUG: Buttons 7, 8, 9 simulate pair long-presses
    if (button === "7" && this.waitingForUserInput) {
      this.fancyLogger.logMessage(
        "DEBUG: Button 7 pressed - simulating pair 1 (buttons 1&2) long-press",
      );
      this._handlePairLongPressedImmediate(1);
      return;
    }
    if (button === "8" && this.waitingForUserInput) {
      this.fancyLogger.logMessage(
        "DEBUG: Button 8 pressed - simulating pair 2 (buttons 3&4) long-press",
      );
      this._handlePairLongPressedImmediate(2);
      return;
    }
    if (button === "9" && this.waitingForUserInput) {
      this.fancyLogger.logMessage(
        "DEBUG: Button 9 pressed - simulating pair 3 (buttons 5&6) long-press",
      );
      this._handlePairLongPressedImmediate(3);
      return;
    }

    // SPECIAL: Handle button 0 presses in summary state
    if (this.nextState === "summary" && button === "0") {
      this._allLedsWhite();
      this._handleButton0PressInSummary();
      return;
    }

    // === GROUND PAIR DETECTION (works for both initial detection and switching) ===
    const pairNumber = this._getButtonPair(button);

    // Check if this button is part of a pair that should trigger ground detection/switching
    const shouldDetectPair =
      pairNumber &&
      (this.currentGroundPair === null || // No ground set yet
        pairNumber !== this.currentGroundPair); // Different pair than current ground

    if (shouldDetectPair && this._areBothButtonsInPairPressed(pairNumber)) {
      // Clear any existing timer for this pair
      if (this.pairPressTimers[pairNumber]) {
        clearTimeout(this.pairPressTimers[pairNumber]);
      }

      // Reset the triggered flag
      this.longPressTriggered[pairNumber] = false;

      const isInitialDetection = this.currentGroundPair === null;
      const actionType = isInitialDetection
        ? "ground detection"
        : `ground switch from ${this.currentGroundPair}`;
      this.fancyLogger.logMessage(
        `Both buttons in pair ${pairNumber} pressed - starting 3sec timer for ${actionType}`,
      );

      // Set timer to trigger after threshold
      this.pairPressTimers[pairNumber] = setTimeout(() => {
        if (
          this._areBothButtonsInPairPressed(pairNumber) &&
          !this.longPressTriggered[pairNumber]
        ) {
          this.longPressTriggered[pairNumber] = true;
          // Use the same handler for both initial detection and switching
          this._handlePairLongPressedImmediate(pairNumber);
        }
      }, this.longPressThreshold);

      // If no ground is set, don't process LED stepper buttons
      if (isInitialDetection) return;
    }

    // === GROUND IS SET - HANDLE LED STEPPER BUTTONS ===
    if (
      this.currentGroundPair !== null &&
      (this.nextState === "choose-rain" ||
        this.nextState === "choose-wind" ||
        this.nextState === "choose-hour" ||
        this.nextState === "choose-pollution" ||
        this.nextState === "choose-temperature")
    ) {
      let stepperAction = null; // '+' or '-'

      // Determine which buttons are stepper buttons based on current ground pair
      if (this.currentGroundPair === 1) {
        // Ground pair is 1&2, so 5 is -, 6 is +
        if (button === "5") stepperAction = "-";
        else if (button === "6") stepperAction = "+";
      } else if (this.currentGroundPair === 2) {
        // Ground pair is 3&4, so 1 is -, 2 is +
        if (button === "1") stepperAction = "-";
        else if (button === "2") stepperAction = "+";
      } else if (this.currentGroundPair === 3) {
        // Ground pair is 5&6, so 3 is -, 4 is +
        if (button === "3") stepperAction = "-";
        else if (button === "4") stepperAction = "+";
      }

      if (stepperAction) {
        this._handleLocalLedStepper(stepperAction);
      }
    }
  }

  _handleButtonReleased(button, simulated = false) {
    this.buttonStates[button] = 0;

    // SPECIAL: Handle button 0 release in summary state
    if (this.nextState === "summary" && button === "0") {
      this._allLedsOff();
      this._handleButton0ReleaseInSummary();
      return;
    }

    // Check if this button is part of a ground pair
    const pairNumber = this._getButtonPair(button);

    // === GROUND IS NOT SET - CANCEL GROUND DETECTION TIMER IF BUTTON RELEASED ===
    if (this.currentGroundPair === null) {
      // Clear any long press timer for this pair when either button is released
      if (pairNumber && this.pairPressTimers[pairNumber]) {
        clearTimeout(this.pairPressTimers[pairNumber]);
        delete this.pairPressTimers[pairNumber];
        this.fancyLogger.logMessage(
          `Pair ${pairNumber} timer cancelled - button ${button} released before 3 seconds`,
        );
      }
      return; // Don't process anything else when ground is not set
    }

    // === GROUND IS SET ===

    // If this is a button from a DIFFERENT pair (potential ground switch), cancel its timer
    if (
      pairNumber &&
      pairNumber !== this.currentGroundPair &&
      this.pairPressTimers[pairNumber]
    ) {
      clearTimeout(this.pairPressTimers[pairNumber]);
      delete this.pairPressTimers[pairNumber];
      this.fancyLogger.logMessage(
        `Pair ${pairNumber} ground switch timer cancelled - button ${button} released before 3 seconds`,
      );
    }

    // LED stepper buttons work on press only, no need to handle releases

    if (!this.dialogStarted || !this.waitingForUserInput) return;

    // Handle old LED stepper mode if needed
    if (this.mode === "led-stepper") {
      this.fancyLogger.logMessage(`button released raw=${button}`);
      this._handleLedStepper(button);
      return;
    }
  }

  /**
   * Immediate long press handler - called when threshold is reached while both buttons in pair are still held
   * Handles both initial ground detection and ground switching
   * @param {number} pairNumber - The pair number (1, 2, or 3)
   * @private
   */
  _handlePairLongPressedImmediate(pairNumber) {
    if (!this.waitingForUserInput) return;

    // Verify both buttons are still pressed
    if (!this._areBothButtonsInPairPressed(pairNumber)) {
      this.fancyLogger.logWarning(
        `Pair ${pairNumber} long-press triggered but buttons no longer both pressed`,
      );
      //return;
    }

    this.fancyLogger.logMessage(
      `Pair ${pairNumber} long-pressed IMMEDIATELY (${this.longPressThreshold}ms threshold reached while holding both buttons)`,
    );

    // Handle based on current state
    if (this.nextState === "waiting-for-ground") {
      // First long press - set ground and go to welcome
      this.currentGroundPair = pairNumber;
      this.lastGroundPair = pairNumber;
      (async () => {
        await this.animateGroundActivation(pairNumber);
        await this.animateGroundActivation(pairNumber);
        await this.animateGroundActivation(pairNumber);
      })();
      this.nextState = "welcome";
      this.dialogFlow();
    } else if (
      this.nextState === "choose-rain" ||
      this.nextState === "choose-wind" ||
      this.nextState === "choose-hour" ||
      this.nextState === "choose-pollution" ||
      this.nextState === "choose-temperature"
    ) {
      // Check if it's the SAME pair that was just long-pressed
      if (pairNumber === this.lastGroundPair) {
        this.fancyLogger.logMessage(
          `Same pair ${pairNumber} long-pressed again - ignoring`,
        );
        return; // Do nothing if same pair
      }

      // It's a DIFFERENT ground pair - switch state
      this.fancyLogger.logMessage(
        `GROUND SWITCH: Switching from pair ${this.lastGroundPair} to pair ${pairNumber}`,
      );

      // Save current state's LED configuration before switching
      this._saveCurrentStateLedStates();

      // Turn off LEDs from the previous floor before switching
      this.turnOffCurrentFloorLeds();

      // Update to new pair
      this.currentGroundPair = pairNumber;
      this.lastGroundPair = pairNumber;
      (async () => {
        await this.animateGroundActivation(pairNumber);
        await this.animateGroundActivation(pairNumber);
        await this.animateGroundActivation(pairNumber);
      })();

      // Determine the next state and restore its LED configuration
      let targetState = "";

      // Cycle through states: rain → wind → hour → pollution → temperature → summary
      if (this.nextState === "choose-rain") {
        this.windLedStepperInitialized = false;
        targetState = "choose-wind";
        this.nextState = "choose-wind";
      } else if (this.nextState === "choose-wind") {
        this.hourLedStepperInitialized = false;
        targetState = "choose-hour";
        this.nextState = "choose-hour";
      } else if (this.nextState === "choose-hour") {
        this.pollutionLedStepperInitialized = false;
        targetState = "choose-pollution";
        this.nextState = "choose-pollution";
      } else if (this.nextState === "choose-pollution") {
        this.temperatureLedStepperInitialized = false;
        targetState = "choose-temperature";
        this.nextState = "choose-temperature";
      } else if (this.nextState === "choose-temperature") {
        targetState = "summary";
        this.nextState = "summary";
      }

      // Restore the LED states for the new state (except for summary which doesn't have LEDs)
      if (targetState !== "summary") {
        this._restoreStateLedStates(targetState);
      }

      this.dialogFlow();
    }
  }

  /**
   * Handle button 0 press in summary state
   * Tracks presses and checks if 4 presses occur within 3 seconds
   * @private
   */
  _handleButton0PressInSummary() {
    const currentTime = Date.now();

    // If this is the first press, start the timer
    if (this.button0PressCount === 0) {
      this.button0FirstPressTime = currentTime;
      this.button0PressCount = 1;
      this.fancyLogger.logMessage(`Button 0 press 1/4`);
      return;
    }

    // Check if we're still within the 3-second window
    const elapsedTime = currentTime - this.button0FirstPressTime;

    if (elapsedTime > this.button0MaxDuration) {
      // Too much time has passed, reset the counter
      this.fancyLogger.logWarning(
        `Too slow! Resetting. Press button 0 four times within 3 seconds.`,
      );
      this.button0PressCount = 1;
      this.button0FirstPressTime = currentTime;
      this.fancyLogger.logMessage(`Button 0 press 1/4`);
      return;
    }

    // We're within the time window, increment the press count
    this.button0PressCount++;
    this.fancyLogger.logMessage(
      `Button 0 press ${this.button0PressCount}/4 (${(elapsedTime / 1000).toFixed(1)}s elapsed)`,
    );

    // Check if we've reached 4 presses
    if (this.button0PressCount >= 4) {
      this.fancyLogger.logMessage(
        `✓ Success! Four presses in ${(elapsedTime / 1000).toFixed(1)} seconds!`,
      );
      // Don't transition yet - wait for the 4th release
    }
  }

  /**
   * Handle button 0 release in summary state
   * If 4 presses were completed, transition to final state
   * @private
   */
  _handleButton0ReleaseInSummary() {
    // Only transition to final state if we've completed 4 presses
    if (this.button0PressCount >= 4) {
      this.nextState = "final";
      this.goToNextState();
    }
  }
  findClosestLocation() {
    // Create the final choice array
    this.finalChoice = [
      this.rainCount,
      this.windCount,
      this.hourCount,
      this.pollutionCount,
      this.temperatureCount,
    ];

    // Database of locations with their climate profiles
    const locationDatabase = [
      // FROID POLAIRE / SUBPOLAIRE
      {
        name: "McMurdo, Antarctique",
        profile: [1, 3, 9, 1, 1],
        category: "Froid Polaire",
      },
      {
        name: "Vostok, Antarctique",
        profile: [1, 2, 10, 1, 1],
        category: "Froid Polaire",
      },
      {
        name: "Longyearbyen, Svalbard",
        profile: [2, 4, 9, 1, 2],
        category: "Froid Polaire",
      },
      {
        name: "Reykjavik, Islande",
        profile: [4, 5, 8, 2, 3],
        category: "Froid Polaire",
      },
      {
        name: "Nuuk, Groenland",
        profile: [3, 5, 9, 1, 2],
        category: "Froid Polaire",
      },

      // OCÉANIQUE / PLUVIEUX
      {
        name: "Bergen, Norvège",
        profile: [6, 4, 7, 2, 4],
        category: "Océanique",
      },
      {
        name: "Vancouver, Canada",
        profile: [4, 3, 7, 3, 5],
        category: "Océanique",
      },
      { name: "Seattle, USA", profile: [4, 3, 7, 5, 5], category: "Océanique" },
      {
        name: "Dublin, Irlande",
        profile: [3, 4, 8, 4, 5],
        category: "Océanique",
      },
      {
        name: "Wellington, NZ",
        profile: [5, 6, 8, 3, 6],
        category: "Océanique",
      },

      // TROPICAL HUMIDE / ORAGEUX
      {
        name: "Amazonas, Brésil",
        profile: [8, 3, 6, 2, 8],
        category: "Tropical Humide",
      },
      {
        name: "Manaus, Brésil",
        profile: [7, 2, 6, 6, 8],
        category: "Tropical Humide",
      },
      {
        name: "Bangkok, Thaïlande",
        profile: [7, 2, 7, 8, 9],
        category: "Tropical Humide",
      },
      {
        name: "Jakarta, Indonésie",
        profile: [6, 3, 8, 9, 9],
        category: "Tropical Humide",
      },
      {
        name: "Singapour",
        profile: [6, 2, 7, 7, 9],
        category: "Tropical Humide",
      },

      // ZONES À CYCLONES / OURAGANS
      {
        name: "Miami, USA",
        profile: [8, 7, 6, 7, 9],
        category: "Zones à Cyclones",
      },
      {
        name: "La Nouvelle-Orléans, USA",
        profile: [8, 8, 7, 6, 9],
        category: "Zones à Cyclones",
      },
      {
        name: "Manille, Philippines",
        profile: [9, 8, 8, 8, 9],
        category: "Zones à Cyclones",
      },
      {
        name: "La Havane, Cuba",
        profile: [7, 7, 7, 6, 9],
        category: "Zones à Cyclones",
      },
      {
        name: "Cancún, Mexique",
        profile: [7, 6, 6, 5, 9],
        category: "Zones à Cyclones",
      },

      // DÉSERT CHAUD
      {
        name: "Sahara, Algérie",
        profile: [1, 4, 6, 1, 10],
        category: "Désert Chaud",
      },
      {
        name: "Dubaï, EAU",
        profile: [1, 3, 6, 9, 10],
        category: "Désert Chaud",
      },
      {
        name: "Phoenix, USA",
        profile: [1, 3, 6, 7, 10],
        category: "Désert Chaud",
      },
      {
        name: "Riyad, Arabie Saoudite",
        profile: [1, 4, 6, 8, 10],
        category: "Désert Chaud",
      },
      {
        name: "Alice Springs, Australie",
        profile: [1, 5, 6, 2, 9],
        category: "Désert Chaud",
      },

      // PLAINES À TORNADES
      {
        name: "Oklahoma City, USA",
        profile: [7, 8, 7, 5, 7],
        category: "Plaines à Tornades",
      },
      {
        name: "Kansas, USA",
        profile: [7, 9, 7, 4, 7],
        category: "Plaines à Tornades",
      },
      {
        name: "Dallas, USA",
        profile: [6, 8, 6, 6, 8],
        category: "Plaines à Tornades",
      },
      {
        name: "Nebraska, USA",
        profile: [7, 7, 7, 3, 6],
        category: "Plaines à Tornades",
      },
      {
        name: "Alberta, Canada",
        profile: [6, 7, 7, 2, 5],
        category: "Plaines à Tornades",
      },

      // MÉGAPOLES POLLUÉES
      {
        name: "Pékin, Chine",
        profile: [3, 2, 7, 9, 6],
        category: "Mégapoles Polluées",
      },
      {
        name: "Delhi, Inde",
        profile: [4, 2, 6, 10, 9],
        category: "Mégapoles Polluées",
      },
      {
        name: "Mexico City, Mexique",
        profile: [3, 2, 7, 8, 7],
        category: "Mégapoles Polluées",
      },
      {
        name: "Los Angeles, USA",
        profile: [2, 2, 6, 7, 8],
        category: "Mégapoles Polluées",
      },
      {
        name: "Le Caire, Égypte",
        profile: [1, 3, 6, 8, 9],
        category: "Mégapoles Polluées",
      },

      // TEMPÉRÉ AGRICOLE / CAMPAGNE
      {
        name: "Normandie, France",
        profile: [3, 4, 5, 3, 5],
        category: "Tempéré Agricole",
      },
      {
        name: "Toscane, Italie",
        profile: [2, 3, 6, 4, 7],
        category: "Tempéré Agricole",
      },
      {
        name: "Bavière, Allemagne",
        profile: [3, 3, 6, 4, 5],
        category: "Tempéré Agricole",
      },
      {
        name: "Kyoto, Japon",
        profile: [4, 2, 7, 5, 6],
        category: "Tempéré Agricole",
      },
      {
        name: "Nouvelle-Zélande rurale",
        profile: [3, 4, 6, 2, 6],
        category: "Tempéré Agricole",
      },

      // MONTAGNE
      {
        name: "Chamonix, France",
        profile: [4, 5, 7, 2, 3],
        category: "Montagne",
      },
      {
        name: "Zermatt, Suisse",
        profile: [3, 4, 7, 1, 2],
        category: "Montagne",
      },
      {
        name: "Kathmandu, Népal",
        profile: [5, 3, 6, 5, 6],
        category: "Montagne",
      },
      {
        name: "La Paz, Bolivie",
        profile: [2, 4, 6, 5, 4],
        category: "Montagne",
      },
      { name: "Aspen, USA", profile: [3, 5, 7, 3, 3], category: "Montagne" },

      // TROPICAL PARADISIAQUE
      {
        name: "Maldives",
        profile: [3, 2, 6, 1, 9],
        category: "Tropical Paradisiaque",
      },
      {
        name: "Bora Bora",
        profile: [2, 2, 6, 1, 9],
        category: "Tropical Paradisiaque",
      },
      {
        name: "Seychelles",
        profile: [4, 3, 6, 1, 9],
        category: "Tropical Paradisiaque",
      },
      {
        name: "Hawaï",
        profile: [5, 4, 6, 3, 8],
        category: "Tropical Paradisiaque",
      },
      {
        name: "Île Maurice",
        profile: [4, 3, 6, 4, 8],
        category: "Tropical Paradisiaque",
      },
    ];

    // Calculate Euclidean distance between two arrays
    const calculateDistance = (arr1, arr2) => {
      return Math.sqrt(
        arr1.reduce((sum, val, idx) => {
          return sum + Math.pow(val - arr2[idx], 2);
        }, 0),
      );
    };

    // Find the closest match
    let closestMatch = null;
    let smallestDistance = Infinity;

    locationDatabase.forEach((location) => {
      const distance = calculateDistance(this.finalChoice, location.profile);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestMatch = location;
      }
    });

    // Log the result
    this.fancyLogger.logMessage("═══════════════════════════════════");
    this.fancyLogger.logMessage("YOUR CLIMATE MATCH:");
    this.fancyLogger.logMessage(`Location: ${closestMatch.name}`);
    this.fancyLogger.logMessage(`Category: ${closestMatch.category}`);
    this.fancyLogger.logMessage(
      `Your profile: [${this.finalChoice.join(", ")}]`,
    );
    this.fancyLogger.logMessage(
      `Match profile: [${closestMatch.profile.join(", ")}]`,
    );
    this.fancyLogger.logMessage(`Distance: ${smallestDistance.toFixed(2)}`);
    this.fancyLogger.logMessage("═══════════════════════════════════");

    // Store the result
    this.matchedLocation = closestMatch;
    this.matchDistance = smallestDistance;

    return closestMatch;
  }
  /**
   * override de _handleButtonLongPressed de TalkMachine
   * This is called on button RELEASE by the parent class if duration >= longPressDelay
   * We handle everything immediately in _handlePairLongPressedImmediate, so this does nothing
   * @override
   * @protected
   */
  _handleButtonLongPressed(button, simulated = false) {
    // Do nothing - we handle long press immediately when threshold is reached for pairs
    // This method is only called by parent class on release, but we've already handled it
    this.fancyLogger.logMessage(
      `Button ${button} released after long press (already handled immediately via pair logic)`,
    );
  }

  /**
   * override de _handleTextToSpeechEnded de TalkMachine
   * @override
   * @protected
   */
  _handleTextToSpeechEnded() {
    this.fancyLogger.logSpeech("speech ended");

    if (this.speechQueueActive) {
      if (this.speechQueue.length > 0) {
        this.speakNormal(this.speechQueue.shift());
        return;
      }

      this.speechQueueActive = false;
      this.speechQueue = [];
    }

    this._setCaseAudioDucking(false);

    if (this.nextState === "final" && this.finalSpeechPhase === 1) {
      this.finalSpeechPhase = 2;

      (async () => {
        await this.animateGroundArraysLoading(3);

        const match = this.finalMatchedLocation || this.findClosestLocation();
        this.speakNormal(
          `Correspondance trouvée. Cette météo se trouve actuellement à: ${match.name}.`,
        );
      })();

      return;
    }

    if (this.shouldContinue) {
      // aller à l'état suivant après la fin de la parole
      this.shouldContinue = false;
      this.goToNextState();
    }
  }

  /**
   * Gérer l'erreur d'input utilisateur
   * @protected
   */
  _handleUserInputError() {
    this.fancyLogger.logWarning("user input is not allowed at this time");
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * Fonctions pour le simulateur
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Gérer les boutons test UI du simulateur
   * @param {number} button - index du bouton
   * @override
   * @protected
   */
  _handleTesterButtons(button) {
    switch (button) {
      case 1:
        this.ledsAllChangeColor("yellow");
        break;
      case 2:
        this.ledsAllChangeColor("green", 1);
        break;
      case 3:
        this.ledsAllChangeColor("pink", 2);
        break;
      case 4:
        this.ledChangeRGB(0, 255, 100, 100);
        this.ledChangeRGB(1, 0, 100, 170);
        this.ledChangeRGB(2, 0, 0, 170);
        this.ledChangeRGB(3, 150, 170, 70);
        this.ledChangeRGB(4, 200, 160, 0);
        break;

      default:
        this.fancyLogger.logWarning("no action defined for button " + button);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const dialogMachine = new DialogMachine();
});
