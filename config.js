const path = require('path');
const os = require('os');

/**
 * Bot Configuration File
 * This file contains all the centralized settings for your WhatsApp bot
 */

// Owner/Admin settings
const config = {
    // Bot owner WhatsApp numbers (in international format without +)
    // Add multiple numbers for multiple owners
    owner: ['6287736854912'], // Replace with your number, e.g., '6281234567890'
    
    // Bot name/identity
    botName: 'Baileys WhatsApp Bot',
    botVersion: '1.0.0',
    
    // Command settings
    prefix: '!', // Command prefix for normal commands
    
    // Paths 
    sessionsDir: path.join(__dirname, 'sessions'),
    logsDir: path.join(__dirname, 'logs'),
    commandsDir: path.join(__dirname, 'commands'),
    uploadsDir: path.join(__dirname, 'uploads'),
    
    // Runtime settings
    maxFileSize: 100 * 1024 * 1024, // 100MB max file size
    maxProcessingTime: 30 * 1000, // 30 seconds timeout for operations
    
    // Feature toggles
    features: {
        groupManagement: true,
        autoResponse: true,
        downloadMedia: true,
        commandLogging: true,
        autoReconnect: true
    },
    
    // Custom messages
    messages: {
        welcome: 'Selamat datang di grup!',
        goodbye: 'Sampai jumpa lagi!',
        error: 'Maaf, terjadi kesalahan saat memproses permintaan Anda.',
        unauthorized: 'Anda tidak memiliki izin untuk menggunakan perintah ini.',
        commandNotFound: 'Perintah tidak ditemukan. Ketik !help untuk melihat daftar perintah.',
        processingCommand: 'Sedang memproses permintaan Anda...',
        ownerOnly: 'Perintah ini hanya dapat digunakan oleh pemilik bot.'
    },
    
    // System settings
    system: {
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        maxMemoryUsage: 80, // Percentage of max memory usage before optimizing
        cpuThrottle: 90, // Percentage of CPU usage before throttling processes
        hostname: os.hostname(),
        platform: os.platform()
    },
    
    // Database settings (if you plan to add a database later)
    database: {
        enabled: false,
        type: 'json', // 'json', 'mongodb', 'mysql'
        path: path.join(__dirname, 'database.json')
    },
    
    // API settings (if you plan to use external APIs)
    apis: {
        // Add your APIs here
        weatherApi: {
            enabled: false,
            key: '',
            endpoint: 'https://api.example.com/weather'
        },
        translationApi: {
            enabled: false,
            key: '',
            endpoint: 'https://api.example.com/translate'
        }
    }
};

// Convert owner numbers to WhatsApp format
config.ownerNumbers = config.owner.map(num => `${num}@s.whatsapp.net`);

// Export the configuration
module.exports = config;
