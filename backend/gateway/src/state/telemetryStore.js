'use strict';

class TelemetryStore {
  constructor(historyDepth) {
    this.historyDepth = historyDepth;
    this.latestPacket = null;
    this.history = [];
    this.ingestCount = 0;
    this.parseErrorCount = 0;
    this.lastIngestAt = null;
  }

  addPacket(packet) {
    this.latestPacket = packet;
    this.ingestCount += 1;
    this.lastIngestAt = Date.now();

    this.history.push(packet);
    if (this.history.length > this.historyDepth) {
      this.history.shift();
    }
  }

  incrementParseError() {
    this.parseErrorCount += 1;
  }

  getLatest() {
    return this.latestPacket;
  }

  getHistory(limit = 50) {
    const n = Math.max(1, limit);
    return this.history.slice(-n);
  }

  getStats() {
    return {
      ingestCount: this.ingestCount,
      parseErrorCount: this.parseErrorCount,
      bufferedPackets: this.history.length,
      lastIngestAt: this.lastIngestAt
    };
  }
}

module.exports = {
  TelemetryStore
};
