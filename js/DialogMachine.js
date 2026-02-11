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

    // Tracking for long-press dialog logic
    this.currentGroundButton = null; // Tracks which button (3, 4, or 5) is currently active
    this.lastLongPressedButton = null; // Tracks the last button that completed a long press
    this.longPressThreshold = 3000; // 3 seconds in milliseconds
    this.buttonPressTimers = {}; // Tracks timers for each button
    this.longPressTriggered = {}; // Tracks if long press already triggered for each button
    
    // LED stepper initialization flags
    this.rainLedStepperInitialized = false;
    this.windLedStepperInitialized = false;
  }

  /**
   * Get the current LED array mapping based on currentGroundButton
   * Maps local indices 0-9 to physical LED indices based on floor
   * Floor 3: LEDs 0-9
   * Floor 4: LEDs 10-19
   * Floor 5: LEDs 20-29
   * @returns {Array<number>} Array of 10 physical LED indices
   */
  getCurrentLedArray() {
    const ledMapping = {
      "3": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],      // Floor 3: LEDs 0-9
      "4": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],  // Floor 4: LEDs 10-19
      "5": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]   // Floor 5: LEDs 20-29
    };
    
    // Default to floor 3 if no ground button is set
    return ledMapping[this.currentGroundButton] || ledMapping["3"];
  }

  /**
   * Light up a LED at a local index (0-9) which maps to the correct physical LED
   * based on the current ground button
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
      `Lighting local LED ${localIndex} → physical LED ${physicalLedIndex} (floor ${this.currentGroundButton})`
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
   * Button 0 = + : first black -> white
   * Button 1 = - : last white -> black
   * @param {number} button
   * @private
   */
  _handleLocalLedStepper(button) {
    // Normalisation: si le système envoie 1..10, on convertit en 0..9
    const b = button
    if (b === "0") {
      // Find first black LED in local array (0-9)
      const localIdx = this.localLedStates.findIndex((s) => s === 0);
      if (localIdx === -1) return; // All LEDs are already white
      
      // Turn on this local LED
      this.localLedStates[localIdx] = 1;
      this.lightUpLocalLed(localIdx, 255, 255, 255); // White
      
      this.fancyLogger.logMessage(`LED Stepper +: Local LED ${localIdx} turned ON`);
      return;
    }

    if (b === "1") {
      // Find last white LED in local array (0-9)
      const localIdx = this.localLedStates.lastIndexOf(1);
      if (localIdx === -1) return; // All LEDs are already black
      
      // Turn off this local LED
      this.localLedStates[localIdx] = 0;
      this.lightUpLocalLed(localIdx, 0, 0, 0); // Black
      
      this.fancyLogger.logMessage(`LED Stepper -: Local LED ${localIdx} turned OFF`);
      console.log(`[local-led-stepper] button=${button} localLedStates=`, [
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

    // Reset ground button tracking
    this.currentGroundButton = null;
    this.lastLongPressedButton = null;
    this.rainLedStepperInitialized = false;
    this.windLedStepperInitialized = false;

    this.fancyLogger.logMessage(
      "Dialog started: Long-press button 3, 4, or 5 to begin...",
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
        this.nextState = "waiting-for-ground"; // Wait for buttons 3, 4, or 5
        this.fancyLogger.logMessage("initialisation done - waiting for long press on button 3, 4, or 5");
        this.waitingForUserInput = true;
        break;

      case "waiting-for-ground":
        // This state is waiting for a long press on buttons 3, 4, or 5
        // The logic is handled in _handleButtonLongPressed
        this.fancyLogger.logMessage("Waiting for long press on button 3, 4, or 5...");
        break;

      case "welcome":
        // CONCEPT: First ground button was long-pressed
        this.fancyLogger.logMessage(`Welcome! Button ${this.currentGroundButton} long-pressed`);
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

  _handleButtonPressed(button, simulated = false) {
    this.buttonStates[button] = 1;
    
    // Handle LED stepper for buttons 0 and 1 when in choose-rain or choose-wind
    if ((this.nextState === "choose-rain" || this.nextState === "choose-wind") && 
        (button === "0" || button === "1")) {
      this._handleLocalLedStepper(button);
      return;
    }
    
    // Start long press timer for ground buttons (3, 4, 5)
    const isGroundButton = button === "3" || button === "4" || button === "5";
    if (isGroundButton && this.waitingForUserInput) {
      // Clear any existing timer for this button
      if (this.buttonPressTimers[button]) {
        clearTimeout(this.buttonPressTimers[button]);
      }
      
      // Reset the triggered flag
      this.longPressTriggered[button] = false;
      
      // Set new timer to trigger after longPressThreshold
      this.buttonPressTimers[button] = setTimeout(() => {
        // Trigger long press immediately (while button is still held)
        if (this.buttonStates[button] === 1 && !this.longPressTriggered[button]) {
          this.longPressTriggered[button] = true;
          this._handleButtonLongPressedImmediate(button);
        }
      }, this.longPressThreshold);
    }
    
    if (this.waitingForUserInput) {
      // this.dialogFlow('pressed', button);
    }
  }

  _handleButtonReleased(button, simulated = false) {
    // Convert button to number (it comes in as a string)
    
    this.buttonStates[button] = 0;
    
    // Clear any long press timer for this button
    if (this.buttonPressTimers[button]) {
      clearTimeout(this.buttonPressTimers[button]);
      delete this.buttonPressTimers[button];
    }

    if (!this.dialogStarted || !this.waitingForUserInput) return;

    // Check if this is the currently active ground button being released
    const isGroundButton = button === "3" || button === "4" || button === "5";
    
    if (isGroundButton && button === this.currentGroundButton) {
      this.fancyLogger.logMessage(`Button ${button} (ground) released - current button cleared`);
      
      // In choose-rain or choose-wind, note that the button was released
      // The user now needs to long-press another ground button to switch modes
      if (this.nextState === "choose-rain" || this.nextState === "choose-wind") {
        this.fancyLogger.logMessage("Waiting for next ground button long-press...");
      }
    }

    // Handle old LED stepper mode if needed
    if (this.mode === "led-stepper") {
      this.fancyLogger.logMessage(`button released raw=${button}`);
      this._handleLedStepper(button);
      return;
    }

    // You can add more released logic here if needed
    // this.dialogFlow("released", button);
  }

  /**
   * Immediate long press handler - called when threshold is reached while button is still held
   * @param {string} button
   * @private
   */
  _handleButtonLongPressedImmediate(button) {
    if (!this.waitingForUserInput) return;

    // Check if this is one of the ground buttons (3, 4, or 5)
    const isGroundButton = button === "3" || button === "4" || button === "5";

    if (!isGroundButton) {
      this.fancyLogger.logWarning(`Button ${button} is not part of the ground (3, 4, 5)`);
      return;
    }

    this.fancyLogger.logMessage(`Button ${button} long-pressed IMMEDIATELY (${this.longPressThreshold}ms threshold reached while holding)`);

    // Handle based on current state
    if (this.nextState === "waiting-for-ground") {
      // First long press - go to welcome immediately
      this.currentGroundButton = button;
      this.lastLongPressedButton = button;
      this.nextState = "welcome";
      this.dialogFlow();
    } else if (this.nextState === "choose-rain" || this.nextState === "choose-wind") {
      // Check if it's the SAME button that was just long-pressed
      if (button === this.lastLongPressedButton) {
        this.fancyLogger.logMessage(`Same button ${button} long-pressed again - ignoring`);
        return; // Do nothing if same button
      }
      
      // It's a DIFFERENT ground button - switch state
      this.fancyLogger.logMessage(`Switching from button ${this.lastLongPressedButton} to button ${button}`);
      
      // Turn off LEDs from the previous floor before switching
      this.turnOffCurrentFloorLeds();
      
      // Update to new button
      this.currentGroundButton = button;
      this.lastLongPressedButton = button;
      
      // Reset local LED states when switching floors
      this.localLedStates.fill(0);
      
      // Toggle between choose-rain and choose-wind
      if (this.nextState === "choose-rain") {
        this.windLedStepperInitialized = false;
        this.nextState = "choose-wind";
      } else {
        this.rainLedStepperInitialized = false;
        this.nextState = "choose-rain";
      }
      
      this.dialogFlow();
    }
  }

  /**
   * override de _handleButtonLongPressed de TalkMachine
   * This is called on button RELEASE by the parent class if duration >= longPressDelay
   * We handle everything immediately in _handleButtonLongPressedImmediate, so this does nothing
   * @override
   * @protected
   */
  _handleButtonLongPressed(button, simulated = false) {
    // Do nothing - we handle long press immediately when threshold is reached
    // This method is only called by parent class on release, but we've already handled it
    this.fancyLogger.logMessage(`Button ${button} released after long press (already handled immediately)`);
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