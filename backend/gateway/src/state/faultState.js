'use strict';

class FaultState {
  constructor(queueDepth) {
    this.queueDepth = queueDepth;
    this.commands = [];
  }

  addCommand(command) {
    this.commands.push(command);
    if (this.commands.length > this.queueDepth) {
      this.commands.shift();
    }
  }

  getRecent(limit = 30) {
    const n = Math.max(1, limit);
    return this.commands.slice(-n);
  }
}

module.exports = {
  FaultState
};
