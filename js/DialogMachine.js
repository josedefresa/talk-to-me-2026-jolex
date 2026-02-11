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
    this.longPressThreshold = 3000; // 3 seconds in milliseconds
    this.pairPressTimers = {}; // Tracks timers for each pair
    this.longPressTriggered = {}; // Tracks if long press already triggered for each pair
    
    // Button pair definitions: pair 1 = buttons 1&2, pair 2 = buttons 3&4, pair 3 = buttons 5&6
    this.buttonPairs = {
      1: ["1", "2"], // Pair 1
      2: ["3", "4"], // Pair 2
      3: ["5", "6"]  // Pair 3
    };
    
    // LED stepper initialization flags
    this.rainLedStepperInitialized = false;
    this.windLedStepperInitialized = false;
    this.hourLedStepperInitialized = false;
    this.pollutionLedStepperInitialized = false;
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
      "1": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],      // Pair 1 (buttons 1&2): LEDs 0-9
      "2": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],  // Pair 2 (buttons 3&4): LEDs 10-19
      "3": [19, 18, 17, 16, 15, 14, 13, 12, 11, 10]   // Pair 3 (buttons 5&6): LEDs 20-29
    };
    
    // Default to floor 1 if no ground pair is set
    return ledMapping[this.currentGroundPair] || ledMapping["1"];
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
      this.fancyLogger.logWarning(`Invalid local LED index: ${localIndex}. Must be 0-9.`);
      return;
    }

    const currentLedArray = this.getCurrentLedArray();
    const physicalLedIndex = currentLedArray[localIndex];
    
    this.fancyLogger.logMessage(
      `Lighting local LED ${localIndex} → physical LED ${physicalLedIndex} (floor ${this.currentGroundPair})`
    );
    
    this.ledChangeRGB(physicalLedIndex, r, g, b);
  }

  /**
   * Turn off all LEDs in the current floor range
   */
  turnOffCurrentFloorLeds() {
    const currentLedArray = this.getCurrentLedArray();
    currentLedArray.forEach(physicalIndex => {
      this.ledChangeRGB(physicalIndex, 0, 0, 0);
    });
  }

  /**
   * Local LED stepper: works with indices 0-9 for the current floor
   * Action "+" : first black -> white
   * Action "-" : last white -> black
   * @param {string} action - "+" or "-"
   * @private
   */
  _handleLocalLedStepper(action) {
    if (action === "+") {
      // Find first black LED in local array (0-9)
      const localIdx = this.localLedStates.findIndex((s) => s === 0);
      if (localIdx === -1) return; // All LEDs are already white
      
      // Turn on this local LED
      this.localLedStates[localIdx] = 1;
      this.lightUpLocalLed(localIdx, 255, 255, 255); // White
      
      this.fancyLogger.logMessage(`LED Stepper +: Local LED ${localIdx} turned ON`);
      return;
    }

    if (action === "-") {
      // Find last white LED in local array (0-9)
      const localIdx = this.localLedStates.lastIndexOf(1);
      if (localIdx === -1) return; // All LEDs are already black
      
      // Turn off this local LED
      this.localLedStates[localIdx] = 0;
      this.lightUpLocalLed(localIdx, 0, 0, 0); // Black
      
      this.fancyLogger.logMessage(`LED Stepper -: Local LED ${localIdx} turned OFF`);
      console.log(`[local-led-stepper] action=${action} localLedStates=`, [
        ...this.localLedStates,
      ]);
    }
  }

  /* CONTRÔLE DU DIALOGUE */
  startDialog() {
    this.dialogStarted = true;
    this.waitingForUserInput = true;

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
        this.fancyLogger.logMessage("initialisation done - waiting for long press on button pairs (1&2, 3&4, or 5&6)");
        this.waitingForUserInput = true;
        break;

      case "waiting-for-ground":
        // This state is waiting for a long press on button pairs 1&2, 3&4, or 5&6
        // The logic is handled in _handleButtonLongPressedImmediate
        this.fancyLogger.logMessage("Waiting for long press on button pairs (1&2, 3&4, or 5&6)...");
        break;

      case "welcome":
        // CONCEPT: First ground pair was long-pressed
        this.fancyLogger.logMessage(`Welcome! Pair ${this.currentGroundPair} long-pressed`);
        this.speakNormal("Welcome! Let's choose the rain.");
        this.shouldContinue = true; // Continue to next state after speech
        this.nextState = "choose-rain";
        break;

      case "choose-rain":
        // CONCEPT: User is in "rain" mode with current button held
        this.fancyLogger.logMessage(`Choose rain mode - current button: ${this.currentGroundButton}`);
        this.speakNormal(`You are in rain mode with button ${this.currentGroundButton}.`);
        
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
        this.fancyLogger.logMessage(`Switched to wind mode - new button: ${this.currentGroundButton}`);
        this.speakNormal(`Now in wind mode with button ${this.currentGroundButton}.`);
        
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
        this.fancyLogger.logMessage(`Switched to hour mode - new button: ${this.currentGroundButton}`);
        this.speakNormal(`Now in hour mode with button ${this.currentGroundButton}.`);
        
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
        this.fancyLogger.logMessage(`Switched to pollution mode - new button: ${this.currentGroundButton}`);
        this.speakNormal(`Now in pollution mode with button ${this.currentGroundButton}.`);
        
        // Initialize LED stepper for this floor if first time entering
        if (!this.pollutionLedStepperInitialized) {
          this.turnOffCurrentFloorLeds();
          this.pollutionLedStepperInitialized = true;
        }
        
        // LED stepper is handled in _handleButtonPressed for buttons 0 and 1
        this.waitingForUserInput = true;
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
    this.speechText(_text, this.preset_voice_normal);
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
    const b = button 

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
    
    // DEBUG: Buttons 7, 8, 9 simulate pair long-presses
    if (button === "7" && this.waitingForUserInput) {
      this.fancyLogger.logMessage("DEBUG: Button 7 pressed - simulating pair 1 (buttons 1&2) long-press");
      this._handlePairLongPressedImmediate(1);
      return;
    }
    if (button === "8" && this.waitingForUserInput) {
      this.fancyLogger.logMessage("DEBUG: Button 8 pressed - simulating pair 2 (buttons 3&4) long-press");
      this._handlePairLongPressedImmediate(2);
      return;
    }
    if (button === "9" && this.waitingForUserInput) {
      this.fancyLogger.logMessage("DEBUG: Button 9 pressed - simulating pair 3 (buttons 5&6) long-press");
      this._handlePairLongPressedImmediate(3);
      return;
    }
    
    // === GROUND IS NOT SET - CHECK FOR GROUND PAIR DETECTION ===
    if (this.currentGroundPair === null) {
      // Check if this button is part of a ground pair
      const pairNumber = this._getButtonPair(button);
      
      if (pairNumber) {
        // Check if both buttons in the pair are now pressed
        if (this._areBothButtonsInPairPressed(pairNumber)) {
          // Both buttons are pressed - start timer for this pair
          
          // Clear any existing timer for this pair
          if (this.pairPressTimers[pairNumber]) {
            clearTimeout(this.pairPressTimers[pairNumber]);
          }
          
          // Reset the triggered flag
          this.longPressTriggered[pairNumber] = false;
          
          this.fancyLogger.logMessage(`Both buttons in pair ${pairNumber} pressed - starting 3sec timer for ground detection`);
          
          // Set new timer to trigger after longPressThreshold
          this.pairPressTimers[pairNumber] = setTimeout(() => {
            // Check if both buttons are STILL pressed after the threshold
            if (this._areBothButtonsInPairPressed(pairNumber) && !this.longPressTriggered[pairNumber]) {
              this.longPressTriggered[pairNumber] = true;
              this._handlePairLongPressedImmediate(pairNumber);
            }
          }, this.longPressThreshold);
        }
      }
      return; // Don't process anything else when ground is not set
    }
    
    // === GROUND IS SET ===
    
    // First, check if this button is part of a DIFFERENT ground pair being pressed
    const pairNumber = this._getButtonPair(button);
    
    // If this is a different pair than the current ground, check for ground switching
    if (pairNumber && pairNumber !== this.currentGroundPair) {
      // Check if both buttons in this NEW pair are now pressed
      if (this._areBothButtonsInPairPressed(pairNumber)) {
        // Both buttons are pressed - start timer for this pair to switch ground
        
        // Clear any existing timer for this pair
        if (this.pairPressTimers[pairNumber]) {
          clearTimeout(this.pairPressTimers[pairNumber]);
        }
        
        // Reset the triggered flag
        this.longPressTriggered[pairNumber] = false;
        
        this.fancyLogger.logMessage(`Both buttons in pair ${pairNumber} pressed - starting 3sec timer to switch ground from ${this.currentGroundPair}`);
        
        // Set new timer to trigger after longPressThreshold
        this.pairPressTimers[pairNumber] = setTimeout(() => {
          // Check if both buttons are STILL pressed after the threshold
          if (this._areBothButtonsInPairPressed(pairNumber) && !this.longPressTriggered[pairNumber]) {
            this.longPressTriggered[pairNumber] = true;
            this._handleGroundSwitch(pairNumber);
          }
        }, this.longPressThreshold);
      }
    }
    
    // Handle LED stepper buttons (works in parallel with ground switching detection)
    if ((this.nextState === "choose-rain" || 
         this.nextState === "choose-wind" || 
         this.nextState === "choose-hour" || 
         this.nextState === "choose-pollution")) {
      
      let stepperAction = null; // '+' or '-'
      
      // Determine which buttons are stepper buttons based on current ground pair
      if (this.currentGroundPair === 1) {
        // Ground pair is 1&2, so 5 is -, 6 is +
        if (button === "5") {
          stepperAction = "-";
        } else if (button === "6") {
          stepperAction = "+";
        }
      } else if (this.currentGroundPair === 2) {
        // Ground pair is 3&4, so 1 is -, 2 is +
        if (button === "1") {
          stepperAction = "-";
        } else if (button === "2") {
          stepperAction = "+";
        }
      } else if (this.currentGroundPair === 3) {
        // Ground pair is 5&6, so 3 is -, 4 is +
        if (button === "3") {
          stepperAction = "-";
        } else if (button === "4") {
          stepperAction = "+";
        }
      }
      
      if (stepperAction) {
        this._handleLocalLedStepper(stepperAction);
        return;
      }
    }
  }

  _handleButtonReleased(button, simulated = false) {
    this.buttonStates[button] = 0;
    
    // Check if this button is part of a ground pair
    const pairNumber = this._getButtonPair(button);
    
    // === GROUND IS NOT SET - CANCEL GROUND DETECTION TIMER IF BUTTON RELEASED ===
    if (this.currentGroundPair === null) {
      // Clear any long press timer for this pair when either button is released
      if (pairNumber && this.pairPressTimers[pairNumber]) {
        clearTimeout(this.pairPressTimers[pairNumber]);
        delete this.pairPressTimers[pairNumber];
        this.fancyLogger.logMessage(`Pair ${pairNumber} timer cancelled - button ${button} released before 3 seconds`);
      }
      return; // Don't process anything else when ground is not set
    }
    
    // === GROUND IS SET ===
    
    // If this is a button from a DIFFERENT pair (potential ground switch), cancel its timer
    if (pairNumber && pairNumber !== this.currentGroundPair && this.pairPressTimers[pairNumber]) {
      clearTimeout(this.pairPressTimers[pairNumber]);
      delete this.pairPressTimers[pairNumber];
      this.fancyLogger.logMessage(`Pair ${pairNumber} ground switch timer cancelled - button ${button} released before 3 seconds`);
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
   * @param {number} pairNumber - The pair number (1, 2, or 3)
   * @private
   */
  _handlePairLongPressedImmediate(pairNumber) {
    if (!this.waitingForUserInput) return;

    // Verify both buttons are still pressed
    if (!this._areBothButtonsInPairPressed(pairNumber)) {
      this.fancyLogger.logWarning(`Pair ${pairNumber} long-press triggered but buttons no longer both pressed`);
      return;
    }

    this.fancyLogger.logMessage(`Pair ${pairNumber} long-pressed IMMEDIATELY (${this.longPressThreshold}ms threshold reached while holding both buttons)`);

    // Handle based on current state
    if (this.nextState === "waiting-for-ground") {
      // First long press - go to welcome immediately
      this.currentGroundPair = pairNumber;
      this.lastGroundPair = pairNumber;
      this.nextState = "welcome";
      this.dialogFlow();
    } else if (this.nextState === "choose-rain" || 
               this.nextState === "choose-wind" || 
               this.nextState === "choose-hour" || 
               this.nextState === "choose-pollution") {
      // Check if it's the SAME pair that was just long-pressed
      if (pairNumber === this.lastGroundPair) {
        this.fancyLogger.logMessage(`Same pair ${pairNumber} long-pressed again - ignoring`);
        return; // Do nothing if same pair
      }
      
      // It's a DIFFERENT ground pair - switch state
      this.fancyLogger.logMessage(`Switching from pair ${this.lastGroundPair} to pair ${pairNumber}`);
      
      // Turn off LEDs from the previous floor before switching
      this.turnOffCurrentFloorLeds();
      
      // Update to new pair
      this.currentGroundPair = pairNumber;
      this.lastGroundPair = pairNumber;
      
      // Reset local LED states when switching floors
      this.localLedStates.fill(0);
      
      // Cycle through states: rain → wind → hour → pollution → rain
      if (this.nextState === "choose-rain") {
        this.windLedStepperInitialized = false;
        this.nextState = "choose-wind";
      } else if (this.nextState === "choose-wind") {
        this.hourLedStepperInitialized = false;
        this.nextState = "choose-hour";
      } else if (this.nextState === "choose-hour") {
        this.pollutionLedStepperInitialized = false;
        this.nextState = "choose-pollution";
      } else if (this.nextState === "choose-pollution") {
        this.rainLedStepperInitialized = false;
        this.nextState = "choose-rain";
      }
      
      this.dialogFlow();
    }
  }

  /**
   * Handle ground switching - called when a different pair is held for 3 seconds while ground is already set
   * @param {number} newPairNumber - The new pair number to switch to (1, 2, or 3)
   * @private
   */
  _handleGroundSwitch(newPairNumber) {
    if (!this.waitingForUserInput) return;

    // Verify both buttons are still pressed
    if (!this._areBothButtonsInPairPressed(newPairNumber)) {
      this.fancyLogger.logWarning(`Ground switch to pair ${newPairNumber} triggered but buttons no longer both pressed`);
      return;
    }

    this.fancyLogger.logMessage(`GROUND SWITCH: Switching from pair ${this.currentGroundPair} to pair ${newPairNumber}`);

    // Turn off LEDs from the previous floor before switching
    this.turnOffCurrentFloorLeds();
    
    // Update to new pair
    this.currentGroundPair = newPairNumber;
    this.lastGroundPair = newPairNumber;
    
    // Reset local LED states when switching floors
    this.localLedStates.fill(0);
    
    // Cycle through states: rain → wind → hour → pollution → rain
    if (this.nextState === "choose-rain") {
      this.windLedStepperInitialized = false;
      this.nextState = "choose-wind";
    } else if (this.nextState === "choose-wind") {
      this.hourLedStepperInitialized = false;
      this.nextState = "choose-hour";
    } else if (this.nextState === "choose-hour") {
      this.pollutionLedStepperInitialized = false;
      this.nextState = "choose-pollution";
    } else if (this.nextState === "choose-pollution") {
      this.rainLedStepperInitialized = false;
      this.nextState = "choose-rain";
    }
    
    this.dialogFlow();
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
    this.fancyLogger.logMessage(`Button ${button} released after long press (already handled immediately via pair logic)`);
  }

  /**
   * override de _handleTextToSpeechEnded de TalkMachine
   * @override
   * @protected
   */
  _handleTextToSpeechEnded() {
    this.fancyLogger.logSpeech("speech ended");
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