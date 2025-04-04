const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { executeCommand } = require('./exec-command');
const { evaluateCode } = require('./eval-command');
const config = require('./config');

// Load commands from commands folder
const commands = new Map();

// Create commands directory if it doesn't exist
if (!fs.existsSync(config.commandsDir)) {
    fs.mkdirSync(config.commandsDir, { recursive: true });
}

// Load all command modules
const loadCommands = () => {
    commands.clear();
    const commandFiles = fs.readdirSync(config.commandsDir).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        try {
            const command = require(path.join(config.commandsDir, file));
            if (command.name && command.execute) {
                commands.set(command.name.toLowerCase(), command);
                // Don't show this in terminal, only in log file
                logger.info(`Loaded command: ${command.name}`);
            } else {
                logger.warn(`Command file ${file} is missing required properties`);
            }
        } catch (error) {
            logger.error({ error }, `Error loading command file ${file}`);
        }
    }
    
    logger.terminal(`📚 Loaded ${commands.size} commands`);
};

// Initial command loading
loadCommands();

// Watch for changes in the commands directory
fs.watch(config.commandsDir, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
        // Clear require cache for this file
        const filePath = path.join(config.commandsDir, filename);
        if (require.cache[require.resolve(filePath)]) {
            delete require.cache[require.resolve(filePath)];
        }
        
        // Reload all commands
        logger.terminal(`🔄 Command file changed, reloading commands...`);
        loadCommands();
    }
});

/**
 * Handle incoming messages
 * @param {import('@whiskeysockets/baileys').WASocket} sock - The WhatsApp socket
 * @param {object} message - The message object
 */
async function messageHandler(sock, message) {
    try {
        // Check if message has a text body
        const body = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || 
                    message.message?.imageMessage?.caption || 
                    message.message?.videoMessage?.caption;
                    
        if (!body) return;
        
        const sender = message.key.remoteJid;
        
        // Command pattern for shell execution ($)
        if (body.startsWith('$ ')) {
            const command = body.slice(2).trim();
            await executeCommand(sock, message, command);
            return;
        }
        
        // Command pattern for JS evaluation (> and =>)
        if (body.startsWith('> ')) {
            const code = body.slice(2).trim();
            await evaluateCode(sock, message, code, false);
            return;
        }
        
        if (body.startsWith('=> ')) {
            const code = body.slice(3).trim();
            await evaluateCode(sock, message, code, true);
            return;
        }
        
        // Handle other message types or commands
        const messageType = Object.keys(message.message)[0];
        let messageContent;
        
        if (messageType === 'conversation') {
            messageContent = message.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            messageContent = message.message.extendedTextMessage.text;
        } else {
            messageContent = 'Non-text message received';
        }
        
        const senderNumber = message.key.remoteJid;
        
        // Log full message details to file, but nothing to terminal
        logger.info({
            sender: senderNumber,
            type: messageType,
            content: messageContent
        }, 'Message received');
        
        // Process commands
        if (messageContent.startsWith(config.prefix)) {
            const [commandName, ...args] = messageContent.slice(config.prefix.length).split(' ');
            const command = commands.get(commandName.toLowerCase());
            
            // Only show executed commands in terminal
            if (command) {
                logger.terminal(`🔹 ${senderNumber}: ${config.prefix}${commandName}`);
                await command.execute(sock, message, args.join(' '), {
                    senderNumber,
                    messageContent,
                    messageType,
                    config
                });
                
                if (config.features.commandLogging) {
                    logger.info(`Command ${commandName} executed by ${senderNumber}`);
                }
            } else {
                logger.terminal(`❓ ${senderNumber}: Unknown command ${config.prefix}${commandName}`);
                await sock.sendMessage(senderNumber, { 
                    text: config.messages.commandNotFound
                });
                logger.info(`Unknown command ${commandName} requested by ${senderNumber}`);
            }
        }
        
    } catch (error) {
        logger.error({ error }, 'Error handling message');
        logger.terminal('❌ Error handling message: ' + error.message);
    }
}

module.exports = { messageHandler };
