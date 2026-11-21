// Keyboard and mouse input for Palmera Bay. Tracks held keys, edge-triggered
// presses (so E / Space / F fire once per tap), and the mouse position in
// screen space for aiming.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseClicked: false,
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.key.toLowerCase());
    input.keys.add(event.key.toLowerCase());
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.mouseClicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });

  input.held = (...names) => names.some((n) => input.keys.has(n));
  input.wasPressed = (name) => input.pressed.has(name);
  input.endFrame = () => {
    input.pressed.clear();
    input.mouseClicked = false;
  };
  return input;
}
