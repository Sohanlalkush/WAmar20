const logger = require('../logger');

module.exports = {
    name: 'ping',
    description: 'Check if bot is online',
    execute: async (sock, message, args, context) => {
        const { senderNumber } = context;
        // Log details to file only
        logger.info(`Executing ping command for ${senderNumber}`);
        await sock.sendMessage(senderNumber, { text: 'Pong!' });
    }
};
