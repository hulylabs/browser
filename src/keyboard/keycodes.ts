import { KeyCode } from "cef-client";

/**
 * Converts a DOM KeyboardEvent.code string to our internal KeyCode enum value
 * @param code The KeyboardEvent.code string (e.g., "KeyA", "Digit1", "ArrowUp", etc.)
 * @returns The corresponding KeyCode enum value
 */
export function domCodeToKeyCode(code: string): KeyCode {
  switch (code) {
    // Basic controls
    case "Backspace":
      return KeyCode.BACKSPACE;
    case "Tab":
      return KeyCode.TAB;
    case "Enter":
      return KeyCode.ENTER;
    case "ShiftLeft":
      return KeyCode.LEFT_SHIFT;
    case "ShiftRight":
      return KeyCode.RIGHT_SHIFT;
    case "ControlLeft":
      return KeyCode.LEFT_CONTROL;
    case "ControlRight":
      return KeyCode.RIGHT_CONTROL;
    case "AltLeft":
      return KeyCode.LEFT_ALT;
    case "AltRight":
      return KeyCode.RIGHT_ALT;
    case "Pause":
      return KeyCode.PAUSE;
    case "CapsLock":
      return KeyCode.CAPS_LOCK;
    case "Escape":
      return KeyCode.ESCAPE;
    case "Space":
      return KeyCode.SPACE;
    case "PageUp":
      return KeyCode.PAGE_UP;
    case "PageDown":
      return KeyCode.PAGE_DOWN;
    case "End":
      return KeyCode.END;
    case "Home":
      return KeyCode.HOME;

    // Arrow keys
    case "ArrowLeft":
      return KeyCode.LEFT;
    case "ArrowUp":
      return KeyCode.UP;
    case "ArrowRight":
      return KeyCode.RIGHT;
    case "ArrowDown":
      return KeyCode.DOWN;

    // Special keys
    case "PrintScreen":
      return KeyCode.PRINT_SCREEN;
    case "Insert":
      return KeyCode.INSERT;
    case "Delete":
      return KeyCode.DELETE;

    // Numbers (main keyboard)
    case "Digit0":
      return KeyCode.KEY_0;
    case "Digit1":
      return KeyCode.KEY_1;
    case "Digit2":
      return KeyCode.KEY_2;
    case "Digit3":
      return KeyCode.KEY_3;
    case "Digit4":
      return KeyCode.KEY_4;
    case "Digit5":
      return KeyCode.KEY_5;
    case "Digit6":
      return KeyCode.KEY_6;
    case "Digit7":
      return KeyCode.KEY_7;
    case "Digit8":
      return KeyCode.KEY_8;
    case "Digit9":
      return KeyCode.KEY_9;

    // Letters
    case "KeyA":
      return KeyCode.KEY_A;
    case "KeyB":
      return KeyCode.KEY_B;
    case "KeyC":
      return KeyCode.KEY_C;
    case "KeyD":
      return KeyCode.KEY_D;
    case "KeyE":
      return KeyCode.KEY_E;
    case "KeyF":
      return KeyCode.KEY_F;
    case "KeyG":
      return KeyCode.KEY_G;
    case "KeyH":
      return KeyCode.KEY_H;
    case "KeyI":
      return KeyCode.KEY_I;
    case "KeyJ":
      return KeyCode.KEY_J;
    case "KeyK":
      return KeyCode.KEY_K;
    case "KeyL":
      return KeyCode.KEY_L;
    case "KeyM":
      return KeyCode.KEY_M;
    case "KeyN":
      return KeyCode.KEY_N;
    case "KeyO":
      return KeyCode.KEY_O;
    case "KeyP":
      return KeyCode.KEY_P;
    case "KeyQ":
      return KeyCode.KEY_Q;
    case "KeyR":
      return KeyCode.KEY_R;
    case "KeyS":
      return KeyCode.KEY_S;
    case "KeyT":
      return KeyCode.KEY_T;
    case "KeyU":
      return KeyCode.KEY_U;
    case "KeyV":
      return KeyCode.KEY_V;
    case "KeyW":
      return KeyCode.KEY_W;
    case "KeyX":
      return KeyCode.KEY_X;
    case "KeyY":
      return KeyCode.KEY_Y;
    case "KeyZ":
      return KeyCode.KEY_Z;

    // Windows keys
    case "MetaLeft":
      return KeyCode.LEFT_WINDOWS;
    case "MetaRight":
      return KeyCode.RIGHT_WINDOWS;
    case "ContextMenu":
      return KeyCode.CONTEXT_MENU;

    // Numpad
    case "Numpad0":
      return KeyCode.NUMPAD_0;
    case "Numpad1":
      return KeyCode.NUMPAD_1;
    case "Numpad2":
      return KeyCode.NUMPAD_2;
    case "Numpad3":
      return KeyCode.NUMPAD_3;
    case "Numpad4":
      return KeyCode.NUMPAD_4;
    case "Numpad5":
      return KeyCode.NUMPAD_5;
    case "Numpad6":
      return KeyCode.NUMPAD_6;
    case "Numpad7":
      return KeyCode.NUMPAD_7;
    case "Numpad8":
      return KeyCode.NUMPAD_8;
    case "Numpad9":
      return KeyCode.NUMPAD_9;
    case "NumpadMultiply":
      return KeyCode.NUMPAD_MULTIPLY;
    case "NumpadAdd":
      return KeyCode.NUMPAD_ADD;
    case "NumpadComma":
      return KeyCode.NUMPAD_SEPARATOR;
    case "NumpadSubtract":
      return KeyCode.NUMPAD_SUBTRACT;
    case "NumpadDecimal":
      return KeyCode.NUMPAD_DECIMAL;
    case "NumpadDivide":
      return KeyCode.NUMPAD_DIVIDE;

    // Function keys
    case "F1":
      return KeyCode.F1;
    case "F2":
      return KeyCode.F2;
    case "F3":
      return KeyCode.F3;
    case "F4":
      return KeyCode.F4;
    case "F5":
      return KeyCode.F5;
    case "F6":
      return KeyCode.F6;
    case "F7":
      return KeyCode.F7;
    case "F8":
      return KeyCode.F8;
    case "F9":
      return KeyCode.F9;
    case "F10":
      return KeyCode.F10;
    case "F11":
      return KeyCode.F11;
    case "F12":
      return KeyCode.F12;
    case "F13":
      return KeyCode.F13;
    case "F14":
      return KeyCode.F14;
    case "F15":
      return KeyCode.F15;
    case "F16":
      return KeyCode.F16;
    case "F17":
      return KeyCode.F17;
    case "F18":
      return KeyCode.F18;
    case "F19":
      return KeyCode.F19;
    case "F20":
      return KeyCode.F20;
    case "F21":
      return KeyCode.F21;
    case "F22":
      return KeyCode.F22;
    case "F23":
      return KeyCode.F23;
    case "F24":
      return KeyCode.F24;

    // Lock keys
    case "NumLock":
      return KeyCode.NUM_LOCK;
    case "ScrollLock":
      return KeyCode.SCROLL_LOCK;

    // Punctuation and special characters
    case "Semicolon":
      return KeyCode.SEMICOLON;
    case "Equal":
      return KeyCode.EQUAL;
    case "Comma":
      return KeyCode.COMMA;
    case "Minus":
      return KeyCode.MINUS;
    case "Period":
      return KeyCode.PERIOD;
    case "Slash":
      return KeyCode.SLASH;
    case "Backquote":
      return KeyCode.BACKQUOTE;
    case "BracketLeft":
      return KeyCode.BRACKET_LEFT;
    case "Backslash":
      return KeyCode.BACKSLASH;
    case "BracketRight":
      return KeyCode.BRACKET_RIGHT;
    case "Quote":
      return KeyCode.QUOTE;

    // Browser keys
    case "BrowserBack":
      return KeyCode.BROWSER_BACK;
    case "BrowserForward":
      return KeyCode.BROWSER_FORWARD;
    case "BrowserRefresh":
      return KeyCode.BROWSER_REFRESH;
    case "BrowserStop":
      return KeyCode.BROWSER_STOP;
    case "BrowserSearch":
      return KeyCode.BROWSER_SEARCH;
    case "BrowserFavorites":
      return KeyCode.BROWSER_FAVORITES;
    case "BrowserHome":
      return KeyCode.BROWSER_HOME;

    // Volume keys
    case "AudioVolumeMute":
      return KeyCode.VOLUME_MUTE;
    case "AudioVolumeDown":
      return KeyCode.VOLUME_DOWN;
    case "AudioVolumeUp":
      return KeyCode.VOLUME_UP;

    // Media keys
    case "MediaTrackNext":
      return KeyCode.MEDIA_NEXT_TRACK;
    case "MediaTrackPrevious":
      return KeyCode.MEDIA_PREV_TRACK;
    case "MediaStop":
      return KeyCode.MEDIA_STOP;
    case "MediaPlayPause":
      return KeyCode.MEDIA_PLAY_PAUSE;
    case "LaunchMail":
      return KeyCode.MEDIA_LAUNCH_MAIL;
    case "MediaSelect":
      return KeyCode.MEDIA_LAUNCH_MEDIA_SELECT;
    case "LaunchApp1":
      return KeyCode.MEDIA_LAUNCH_APP1;
    case "LaunchApp2":
      return KeyCode.MEDIA_LAUNCH_APP2;

    default:
      console.warn(`Unmapped keyboard code: ${code}`);
      return KeyCode.UNKNOWN;
  }
}
