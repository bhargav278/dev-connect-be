'use strict';

/**
 * Singleton store for the Socket.io server instance.
 * Allows any service to access `io` without circular imports.
 *
 * Usage:
 *   // In server.js (once at startup):
 *   setIo(io);
 *
 *   // In any service:
 *   const { getIo } = require('../utils/getIo');
 *   const io = getIo(); // may be null before server starts
 */

let _io = null;

/**
 * Stores the Socket.io server instance.
 * Must be called once in server.js after creating the io instance.
 *
 * @param {import('socket.io').Server} io
 */
const setIo = (io) => {
  _io = io;
};

/**
 * Returns the stored Socket.io server instance.
 * Returns null if called before setIo (e.g. during tests or early boot).
 *
 * @returns {import('socket.io').Server|null}
 */
const getIo = () => _io;

module.exports = { setIo, getIo };
