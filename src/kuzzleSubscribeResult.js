/**
 * Sugar-code handling the result of a Room.renew call
 * @constructor
 */
function KuzzleSubscribeResult() {
  this.cbs = [];
  this.error = null;
  this.room = null;
}

/**
 * Registers a callback to be called with a subscription result
 * @param {Function} cb
 */
KuzzleSubscribeResult.prototype.onDone = function (cb) {
  if (this.error || this.room) {
    cb(this.error, this.room);
  }
  else {
    this.cbs.push(cb);
  }

  return this;
};

/**
 * Calls all registered callbacks
 *
 * @param {Object} error object
 * @param {Room} room
 */
KuzzleSubscribeResult.prototype.done = function (error, room) {
  this.error = error;
  this.room = room;

  this.cbs.forEach(function (cb) {
    cb(error, room);
  });
};

module.exports = KuzzleSubscribeResult;
