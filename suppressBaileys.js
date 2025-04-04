const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const baileysLogFile = path.join(logger.logsDir, 'baileys', 'verbose.log');

// Ensure the directory exists
if (!fs.existsSync(path.dirname(baileysLogFile))) {
    fs.mkdirSync(path.dirname(baileysLogFile), { recursive: true });
}

// Keep track of the write stream
let baileysLogStream = fs.createWriteStream(baileysLogFile, { flags: 'a' });

// Rotate logs if they get too big (10MB)
const checkLogSize = () => {
    try {
        const stats = fs.statSync(baileysLogFile);
        if (stats.size > 10 * 1024 * 1024) { // 10MB
            // Close the current stream
            baileysLogStream.end();
            
            // Create a backup file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.renameSync(
                baileysLogFile, 
                path.join(path.dirname(baileysLogFile), `verbose-${timestamp}.log`)
            );
            
            // Create a new stream
            baileysLogStream = fs.createWriteStream(baileysLogFile, { flags: 'a' });
        }
    } catch (error) {
        // If file doesn't exist, create a new stream
        baileysLogStream = fs.createWriteStream(baileysLogFile, { flags: 'a' });
    }
};

// Check log size every hour
setInterval(checkLogSize, 60 * 60 * 1000);

// Terms that indicate this is a Baileys internal log message
const baileysTerms = [
    'Session', 
    'prekey', 
    'Closing',
    'Checking',
    'Recursive',
    'buffering',
    'recv',
    'msgRetryCounterMap',
    'decoding',
    'writing history',
    'read receipt',
    'presence',
    'encrypted',
    'identity',
    'ephemeral',
    'HandshakeMessage'
];

// Store original console methods
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

// Function to check if a message is from Baileys
const isBaileysMessage = (args) => {
    const logString = Array.from(args).join(' ');
    return baileysTerms.some(term => logString.includes(term));
};

// Override console methods
const suppressBaileysLogs = () => {
    console.log = function() {
        if (isBaileysMessage(arguments)) {
            // Write to Baileys-specific log file
            const timestamp = new Date().toISOString();
            baileysLogStream.write(`[${timestamp}] [LOG] ${Array.from(arguments).join(' ')}\n`);
        } else {
            originalConsole.log.apply(console, arguments);
        }
    };

    console.error = function() {
        if (isBaileysMessage(arguments)) {
            const timestamp = new Date().toISOString();
            baileysLogStream.write(`[${timestamp}] [ERROR] ${Array.from(arguments).join(' ')}\n`);
        } else {
            originalConsole.error.apply(console, arguments);
        }
    };

    console.warn = function() {
        if (isBaileysMessage(arguments)) {
            const timestamp = new Date().toISOString();
            baileysLogStream.write(`[${timestamp}] [WARN] ${Array.from(arguments).join(' ')}\n`);
        } else {
            originalConsole.warn.apply(console, arguments);
        }
    };

    console.info = function() {
        if (isBaileysMessage(arguments)) {
            const timestamp = new Date().toISOString();
            baileysLogStream.write(`[${timestamp}] [INFO] ${Array.from(arguments).join(' ')}\n`);
        } else {
            originalConsole.info.apply(console, arguments);
        }
    };
};

// Function to restore original console behavior
const restoreConsole = () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    
    // Close the log stream
    if (baileysLogStream) {
        baileysLogStream.end();
    }
};

module.exports = {
    suppressBaileysLogs,
    restoreConsole
};
