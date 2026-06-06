// Dialogue Box UI controller
let elBox, elSpeaker, elContext, elText, elOptions;
let typingInterval = null;
let currentText = '';
let currentTargetText = '';
let isTyping = false;
let onTypeFinishCallback = null;

export let isDialogueActive = false;

/**
 * Initializes the dialogue overlay DOM bindings
 */
export function initDialogue() {
  elBox = document.getElementById('dialogue-box');
  elSpeaker = document.getElementById('dialogue-speaker');
  elContext = document.getElementById('dialogue-context');
  elText = document.getElementById('dialogue-text');
  elOptions = document.getElementById('dialogue-options');
}

/**
 * Instantly completes the typing animation
 */
export function skipTypewriter() {
  if (!isTyping) return;
  clearInterval(typingInterval);
  elText.textContent = currentTargetText;
  elText.classList.remove('typewriter-cursor');
  isTyping = false;
  if (onTypeFinishCallback) {
    onTypeFinishCallback();
  }
}

/**
 * Prints text character-by-character with a typewriter effect
 */
function typeText(text, callback) {
  if (typingInterval) clearInterval(typingInterval);
  
  currentTargetText = text;
  isTyping = true;
  onTypeFinishCallback = callback;
  
  elText.textContent = '';
  elText.classList.add('typewriter-cursor');
  
  let index = 0;
  typingInterval = setInterval(() => {
    elText.textContent += text[index];
    index++;
    if (index >= text.length) {
      clearInterval(typingInterval);
      elText.classList.remove('typewriter-cursor');
      isTyping = false;
      if (callback) callback();
    }
  }, 20); // 20ms per character for brisk readability
}

/**
 * Opens the dialogue card with dynamic speaker, narrative, and choices
 * @param {string} speaker - NPC or Object name
 * @param {string} context - Subtitle or Location
 * @param {string} text - The dialogue message
 * @param {Array} options - List of choices: { text: string, action: function }
 */
export function openDialogue(speaker, context, text, options = []) {
  isDialogueActive = true;
  
  // Clear previous options during typing
  elOptions.innerHTML = '';
  elBox.style.display = 'flex';
  
  elSpeaker.textContent = speaker;
  elContext.textContent = context;
  
  typeText(text, () => {
    // Populate options after typing finishes
    elOptions.innerHTML = '';
    
    // Add default Leave button if none provided
    const choices = options.length > 0 ? options : [{ text: 'Leave', action: () => {} }];
    
    choices.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-btn';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        closeDialogue();
        if (opt.action) opt.action();
      });
      elOptions.appendChild(btn);
    });
  });
}

/**
 * Closes the dialogue interface
 */
export function closeDialogue() {
  isDialogueActive = false;
  isTyping = false;
  if (typingInterval) clearInterval(typingInterval);
  
  elBox.style.display = 'none';
  elText.textContent = '';
  elOptions.innerHTML = '';
}
