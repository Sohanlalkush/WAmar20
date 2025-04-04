const { promisify } = require('util');
const cp = require('child_process');
const exec = promisify(cp.exec).bind(cp);
const logger = require('./logger');
const config = require('./config');

/**
 * Execute shell commands via WhatsApp
 * @param {import('@whiskeysockets/baileys').WASocket} sock - The WhatsApp socket
 * @param {object} message - The message object
 * @param {string} command - The command to execute
 */
async function executeCommand(sock, message, command) {
    const sender = message.key.remoteJid;
    
    // Security check - only allow owner to execute commands
    if (!config.ownerNumbers.includes(message.key.participant || sender)) {
        await sock.sendMessage(sender, { text: config.messages.ownerOnly }, { quoted: message });
        return;
    }
    
    await sock.sendMessage(sender, { text: config.messages.processingCommand }, { quoted: message });
    
    try {
        logger.info(`Executing command: ${command}`);
        const { stdout, stderr } = await exec(command, { 
            timeout: config.maxProcessingTime,
            maxBuffer: 1024 * 1024 // 1MB buffer
        });
        
        if (stdout) {
            await sock.sendMessage(sender, { text: `📋 Result:\n\n${stdout}` }, { quoted: message });
        }
        
        if (stderr) {
            await sock.sendMessage(sender, { text: `⚠️ Error:\n\n${stderr}` }, { quoted: message });
        }
        
        if (!stdout && !stderr) {
            await sock.sendMessage(sender, { text: '✅ Command executed successfully (no output)' }, { quoted: message });
        }
    } catch (error) {
        logger.error({ error }, 'Error executing command');
        await sock.sendMessage(
            sender, 
            { text: `❌ Execution failed:\n\n${error.message}` }, 
            { quoted: message }
        );
    }
}

module.exports = { executeCommand };
