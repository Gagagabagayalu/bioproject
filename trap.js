class Trap {
  constructor(x, y, size, capacity) {
    this.x = x;
    this.y = y;
    this.w = size;
    this.h = size;
    this.capacity = capacity;
    this.open = false;
    this.dragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  draw() {
    push();
    noFill();
    strokeWeight(3);
    stroke(this.open ? color(255, 220, 0) : color(255));
    rect(this.x, this.y, this.w, this.h, 4);
    pop();
  }

  contains(v) {
    const cx = constrain(v.x, this.x, this.x + this.w);
    const cy = constrain(v.y, this.y, this.y + this.h);
    const dx = v.x - cx;
    const dy = v.y - cy;
    return dx * dx + dy * dy < v.collisionRadius * v.collisionRadius;
  }
}