# Talk to Me

## Ressources semaine bloc 1CVmid / ECAL M&ID Février 2026

_Alain Bellet + Livia Schmid_

https://ecal-mid.ch/talktome/

## Notes d'installation

Pour commencer :

 
- Si vous souhaitez créer votre propre version : **Fork** le répertoire

Note: Si vous avez forké ce répertoire, vous recevrez toujours les mises à jour du sous-module `talk-to-me-core` depuis le répertoire original.

## Exemples de code

Tout se passe dans **DialogMachine.js**

## Speech

### Parler

```javascript
this.speechText(text, [index_voix_ou_langue, pitch, rate])
```

Parameters:
- `text`: The text to speak
- `index_voix_ou_langue`: Voice index (number) or language code (string) - optional, default: 'en-US'
  - **Number**: Direct voice index (0, 1, 2, etc.)
  - **String**: Language code ('en-US', 'en-GB', 'fr-FR', 'de-DE', etc.) - automatically selects first matching voice
- `pitch`: Pitch value (0.1-2) (optional, default: 1)
- `rate`: Speech rate (0.1-10) (optional, default: 1)

Examples:
```javascript
// Utiliser un index de voix (méthode classique)
this.speechText('hello', [0, 1, 0.8])

// Utiliser un code de langue (nouvelle méthode)
this.speechText('hello', ['en-US', 1, 0.8])
this.speechText('hello', ['en-GB', 1, 0.8])
this.speechText('bonjour', ['fr-FR', 1, 0.8])
this.speechText('hola', ['es-ES', 1, 0.8])

// Utiliser la voix par défaut (en-US)
this.speechText('hello')
```

### Leds

**couleurs:** black, white, red, green, blue, magenta, yellow, cyan, orange, purple, pink

**Allumer une led**
```javascript
this.ledChangeColor(index, couleur, effet)
```

Parameters:
- `index`: LED index (0-10)
- `couleur`: Color name from the list above
- `effet`: Effect type (0: none, 1: blink, 2: pulse, 3: vibrate)

**Allumer toutes les led**
```javascript
this.ledsAllChangeColor(couleur, effet)
```

Parameters:
- `couleur`: Color name from the list above
- `effet`: Effect type (0: none, 1: blink, 2: pulse, 3: vibrate)

**Allumer une led avec une valeur RGB**
```javascript
this.ledChangeRGB(index, r, g, b)
```

Parameters:
- `index`: LED index (0-50)
- `r`: Red value (0-255)
- `g`: Green value (0-255)
- `b`: Blue value (0-255)

**Allumer toutes les led avec une valeur RGB**
```javascript
this.ledsAllChangeRGB(r, g, b)
```

Parameters:
- `r`: Red value (0-255)
- `g`: Green value (0-255)
- `b`: Blue value (0-255)

**Éteindre toutes les led**
```javascript
this.ledsAllOff()
```

Example:
```javascript
// allumer la première led en rouge
this.ledChangeColor(0, 'red');
// allumer la deuxième led en vert en pulse
this.ledChangeColor(0, 'green', 2);
// allumer la deuxième led en jaune en blink
this.ledChangeColor(0, 'yellow', 1);
// éteindre la première led
this.ledChangeColor(0, 'black');
// allumer toutes les leds en bleu et blink
this.ledsAllChangeColor('blue', 1);
// allumer led avec valeur RGB
this.ledChangeRGB(1, 255, 0, 123);

//éteindre toutes les leds
this.ledsAllOff();
```

### Simple Pattern matcher 

```javascript
this.patternMatcher.start(pattern, stateActual, stateForSuccess, stateForError)
```

Parameters:
- `pattern`: Array of buttons
- `stateActual`: Current state
- `stateForSuccess`: State to transition to on success
- `stateForError`: State to transition to on error

Example:
```javascript
// import the class
import { PatternMatcher } from './utils/PatternMatcher';
// create instance
this.patternMatcher = new PatternMatcher(); // add this to the constructor of the class DialogMachine
// example state in switch case
case 'check-pattern':
    if (!this.patternMatcher.isStarted) {
        console.log(
            'we are at the beginning, press button 1 and 2 and 3 to continue'
        );
        this.patternMatcher.start(
            [1, 2, 3],
            this.nextState,
            'can-speak',
            'input-error'
        );
    } else {
        this.nextState = this.patternMatcher.check(button);
        if (this.nextState != this.lastState) {
            this.goToNextState();
        } else {
            console.log('doing good, continue...');
        }
    }
    break;

      case 'input-error':
          this.fancyLogger.logMessage('This was not the right input, try again!');
          this.nextState = 'check-pattern';
          this.goToNextState();
          break;

      case 'input-success':
          this.fancyLogger.logMessage('Congratulations, you did it');
          break;
