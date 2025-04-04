const logger = require('../logger');

module.exports = {
    name: 'echo',
    description: 'Repeat the text you send',
    execute: async (sock, message, args, context) => {
        const { senderNumber } = context;
        // Log details to file only
        logger.info(`Executing echo command for ${senderNumber} with args: ${args}`);
        
        if (args) {
            await sock.sendMessage(senderNumber, { text: args });
        } else {
            await sock.sendMessage(senderNumber, { text: 'Please provide text to echo!' });
        }
    }
};
