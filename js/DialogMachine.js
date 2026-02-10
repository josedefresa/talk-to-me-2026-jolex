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

    // Tracking for long-press dialog logic
    this.currentTriadButton = null; // Tracks which button (3, 4, or 5) is currently active
    this.longPressThreshold = 3000; // 3 seconds in milliseconds
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
    this._renderAllLedsFromState();

    // Reset triad button tracking
    this.currentTriadButton = null;

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
        this.nextState = "waiting-for-triad"; // Wait for buttons 3, 4, or 5
        this.fancyLogger.logMessage("initialisation done - waiting for long press on button 3, 4, or 5");
        this.waitingForUserInput = true;
        break;

      case "waiting-for-triad":
        // This state is waiting for a long press on buttons 3, 4, or 5
        // The logic is handled in _handleButtonLongPressed
        this.fancyLogger.logMessage("Waiting for long press on button 3, 4, or 5...");
        break;

      case "welcome":
        // CONCEPT: First triad button was long-pressed
        this.fancyLogger.logMessage(`Welcome! Button ${this.currentTriadButton} long-pressed`);
        this.speakNormal("Welcome! Let's choose the rain.");
        this.shouldContinue = true; // Continue to next state after speech
        this.nextState = "choose-rain";
        break;

      case "choose-rain":
        // CONCEPT: User is in "rain" mode with current button held
        this.fancyLogger.logMessage(`Choose rain mode - current button: ${this.currentTriadButton}`);
        this.speakNormal(`You are in rain mode with button ${this.currentTriadButton}.`);
        // Stay in this state until button is released AND another triad button is long-pressed
        // This is handled in _handleButtonReleased and _handleButtonLongPressed
        this.waitingForUserInput = true;
        break;

      case "choose-wind":
        // CONCEPT: User switched to another triad button
        this.fancyLogger.logMessage(`Switched to wind mode - new button: ${this.currentTriadButton}`);
        this.speakNormal(`Now in wind mode with button ${this.currentTriadButton}.`);
        // You can add more logic here or transition to other states
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
    const b = button >= 1 && button <= 10 ? button - 1 : button;

    if (b === 0) {
      const idx = this.ledStates.findIndex((s) => s === 0);
      if (idx === -1) return;
      this.ledStates[idx] = 1;
      this._renderLedFromState(idx);
      return;
    }

    if (b === 1) {
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
    if (this.waitingForUserInput) {
      // this.dialogFlow('pressed', button);
    }
  }

  _handleButtonReleased(button, simulated = false) {
    // Convert button to number (it comes in as a string)
    
    this.buttonStates[button] = 0;

    if (!this.dialogStarted || !this.waitingForUserInput) return;

    // Check if this is the currently active triad button being released
    const isTriadButton = button === "3" || button === "4" || button === "5";
    
    if (isTriadButton && button === this.currentTriadButton) {
      this.fancyLogger.logMessage(`Button ${button} (triad) released - current button cleared`);
      
      // In choose-rain or choose-wind, note that the button was released
      // The user now needs to long-press another triad button to switch modes
      if (this.nextState === "choose-rain" || this.nextState === "choose-wind") {
        this.fancyLogger.logMessage("Waiting for next triad button long-press...");
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
   * override de _handleButtonLongPressed de TalkMachine
   * @override
   * @protected
   */
  _handleButtonLongPressed(button, simulated = false) {
    if (!this.waitingForUserInput) return;

    

    // Check if this is one of the triad buttons (3, 4, or 5)
    const isTriadButton = button === "3" || button === "4" || button === "5";

    if (!isTriadButton) {
      this.fancyLogger.logWarning(`Button ${button} is not part of the triad (3, 4, 5)`);
      return;
    }

    this.fancyLogger.logMessage(`Button ${button} long-pressed (${this.longPressThreshold}ms)`);

    // Handle based on current state
    if (this.nextState === "waiting-for-triad") {
      // First long press - go to welcome
      this.currentTriadButton = button;
      this.nextState = "welcome";
      this.dialogFlow();
    } else if (this.nextState === "choose-rain") {
      // Check if it's a DIFFERENT triad button
      if (button !== this.currentTriadButton) {
        this.fancyLogger.logMessage(`Switching from button ${this.currentTriadButton} to button ${button}`);
        this.currentTriadButton = button;
        this.nextState = "choose-wind";
        this.dialogFlow();
      } else {
        this.fancyLogger.logMessage(`Same button ${button} still pressed - staying in choose-rain`);
      }
    }
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