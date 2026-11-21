// Keyboard and mouse input with edge-triggered presses.
export function createInput(canvas) {
  const input = {
    held: new Set(),
    pressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,

    anyHeld(keys) {
      for (const k of keys) {
        if (this.held.has(k)) return true;
      }
      return false;
    },

    wasPressed(key) {
      return this.pressed.has(key);
    },

    endFrame() {
      this.pressed.clear();
      this.clicked = false;
    },
  };

  const watched = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    " ",
    "Spacebar",
  ];

  window.addEventListener("keydown", (event) => {
    if (watched.includes(event.key)) event.preventDefault();
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (!event.repeat) input.pressed.add(key);
    input.held.add(key);
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    input.held.delete(key);
  });

  window.addEventListener("blur", () => {
    input.held.clear();
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.clicked = true;
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) input.mouseDown = false;
  });

  return input;
}
