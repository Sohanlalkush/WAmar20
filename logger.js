const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure baileys subdirectory exists for verbose logs
const baileysLogsDir = path.join(logsDir, 'baileys');
if (!fs.existsSync(baileysLogsDir)) {
    fs.mkdirSync(baileysLogsDir, { recursive: true });
}

// Find the terminal target index for later use
const TERMINAL_TARGET_INDEX = 3;

// Create log transport with file destinations
const transport = pino.transport({
    targets: [
        // Full logs to app.log file
        {
            target: 'pino/file',
            options: { destination: path.join(logsDir, 'app.log') },
            level: 'info'
        },
        // Error logs to error.log file
        {
            target: 'pino/file',
            options: { destination: path.join(logsDir, 'error.log') },
            level: 'error'
        },
        // Debug logs to a separate file (including Baileys verbose logs)
        {
            target: 'pino/file',
            options: { destination: path.join(logsDir, 'debug.log') },
            level: 'debug'
        },
        // Minimal logs to terminal - only important status updates
        {
            target: 'pino-pretty',
            options: { 
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname,module,sender,type,content,time',
                messageFormat: '{msg}',
                minimumLevel: 'info',
                hideObject: true,
                singleLine: true
            },
            level: 'info'
        }
    ]
});

// Create custom log level for terminal output only
const customLevels = {
    terminal: 35 // Between info (30) and warn (40)
};

// Create and export the logger
const logger = pino({
    level: 'debug', // Lower level to catch all logs
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    customLevels
}, transport);

// Add wrapper methods for simplified terminal logging
logger.terminal = (message) => {
    // This only shows in terminal, not in log files
    logger.info({ terminal: true, msg: message });
};

// Check if the transport has the expected targets before modifying them
if (transport.targets && transport.targets.length > TERMINAL_TARGET_INDEX) {
    const originalSend = transport.targets[TERMINAL_TARGET_INDEX].send;
    
    // Only modify if the send method exists
    if (originalSend) {
        transport.targets[TERMINAL_TARGET_INDEX].send = function(obj) {
            // Only pass high-level info or terminal-marked logs to terminal
            if (obj.terminal || obj.level >= 40) { // 40 is 'warn'
                delete obj.terminal;
                originalSend.call(this, obj);
            }
        };
    }
} else {
    // Fallback for simpler terminal logging if the transport structure is different
    logger.terminal = (message) => {
        console.log(message);
    };
}

// Export the logs directory path
logger.logsDir = logsDir;

module.exports = logger;
