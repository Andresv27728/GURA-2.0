/**
 * Extracts a user JID from a message.
 * Priority is given to mentions, then replies, then text input.
 * @param {object} msg The message object from the socket.
 * @param {string[]} args The arguments array from the command.
 * @returns {string|null} The extracted user JID or null if not found.
 */
export function getUserFromMessage(msg, args) {
  const msgContent = unwrapMessage(msg.message);

  // Check for mentioned JIDs
  if (msgContent?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
    return msgContent.extendedTextMessage.contextInfo.mentionedJid[0];
  }

  // Check for a participant in a replied-to message
  if (msgContent?.extendedTextMessage?.contextInfo?.participant) {
    return msgContent.extendedTextMessage.contextInfo.participant;
  }

  // Fallback to parsing the JID from arguments
  const text = args.join(' ');
  if (text) {
    const numberMatch = text.replace(/[^0-9]/g, '');
    if (numberMatch) {
      return `${numberMatch}@s.whatsapp.net`;
    }
  }

  return null; // Return null if no user is found
}

/**
 * Formats a number of bytes into a human-readable string.
 * @param {number} bytes The number of bytes.
 * @param {number} decimals The number of decimal places to use.
 * @returns {string} The formatted string (e.g., "1.23 MB").
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parses a time string (e.g., "10m", "1h") into milliseconds.
 * @param {string} timeStr The time string to parse.
 * @returns {number|null} The time in milliseconds or null if invalid.
 */
export function parseTimeToMs(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

/**
 * Unwraps a message from its containers (ephemeral, viewOnce, etc.)
 * @param {object} message The message object.
 * @returns {object} The unwrapped message content.
 */
export function unwrapMessage(message) {
  if (!message) return message;
  let content = message;
  const wrappers = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage'
  ];

  let found = true;
  while (found && content) {
    found = false;
    for (const wrapper of wrappers) {
      if (content[wrapper]?.message) {
        content = content[wrapper].message;
        found = true;
        break;
      }
    }
  }
  return content;
}