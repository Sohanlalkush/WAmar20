const util = require('util');
const syntaxError = require('syntax-error');
const logger = require('./logger');
const config = require('./config');

/**
 * Evaluate JavaScript code via WhatsApp
 * @param {import('@whiskeysockets/baileys').WASocket} sock - The WhatsApp socket
 * @param {object} message - The message object
 * @param {string} code - The code to evaluate
 * @param {boolean} returnResult - Whether to return result ('>') or not ('>')
 */
async function evaluateCode(sock, message, code, returnResult = false) {
    const sender = message.key.remoteJid;
    
    // Security check - only allow owner to execute code
    if (!config.ownerNumbers.includes(message.key.participant || sender)) {
        await sock.sendMessage(sender, { text: config.messages.ownerOnly }, { quoted: message });
        return;
    }

    let _text = returnResult ? `return ${code}` : code;
    let result;
    let syntaxErr = '';

    try {
        // Check for syntax errors
        const err = syntaxError(_text, 'Evaluation', {
            allowReturnOutsideFunction: true,
            allowAwaitOutsideFunction: true
        });
        
        if (err) {
            syntaxErr = `❌ Syntax Error:\n\`\`\`${err}\`\`\`\n\n`;
            throw new Error(err);
        }

        // Create context for evaluation
        const AsyncFunction = (async () => {}).constructor;
        const evalFunc = new AsyncFunction(
            'sock', 'message', 'require', 'console', 
            'process', 'util', 'Buffer', 'sender', 'config',
            _text
        );
        
        logger.info(`Evaluating code: ${_text.substring(0, 100)}${_text.length > 100 ? '...' : ''}`);
        result = await evalFunc(
            sock, message, require, console, 
            process, util, Buffer, sender, config
        );
    } catch (error) {
        logger.error({ error }, 'Error evaluating code');
        result = error;
    } finally {
        // Format the result
        const formattedResult = syntaxErr + util.format(result);
        
        // Send result back, with appropriate handling of large responses
        if (formattedResult.length > 4000) {
            await sock.sendMessage(
                sender, 
                { text: `📋 Result (truncated):\n\n${formattedResult.slice(0, 4000)}...` }, 
                { quoted: message }
            );
        } else {
            await sock.sendMessage(
                sender, 
                { text: `📋 Result:\n\n${formattedResult}` }, 
                { quoted: message }
            );
        }
    }
}

module.exports = { evaluateCode };
