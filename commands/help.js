const fs = require('fs');
const path = require('path');
const logger = require('../logger');

module.exports = {
    name: 'help',
    description: 'Display all available commands',
    execute: async (sock, message, args, context) => {
        const { senderNumber } = context;
        // Log details to file only
        logger.info(`Executing help command for ${senderNumber}`);
        
        // Get all command files
        const commandsDir = path.join(__dirname);
        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
        
        // Build help message
        let helpMessage = "Available commands:\n";
        
        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsDir, file));
                if (command.name && command.description) {
                    helpMessage += `!${command.name} - ${command.description}\n`;
                }
            } catch (error) {
                logger.error({ error }, `Error loading command details for help from file ${file}`);
            }
        }
        
        await sock.sendMessage(senderNumber, { text: helpMessage });
    }
};
