
const mongoose = require('mongoose');
const logger = require('./logger');

// Session Schema
const sessionSchema = new mongoose.Schema({
    sessionId: String,
    data: Object
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);

// Connect to MongoDB
mongoose.connect('mongodb+srv://wa_render:wa_render123@wasession.uikatku.mongodb.net/?retryWrites=true&w=majority&appName=wasession')
    .then(() => logger.info('Connected to MongoDB'))
    .catch(err => logger.error('MongoDB connection error:', err));

const store = {
    async useMongoAuthState() {
        const writeData = async (data, file) => {
            try {
                await Session.findOneAndUpdate(
                    { sessionId: file },
                    { data },
                    { upsert: true, new: true }
                );
            } catch (error) {
                logger.error('Error writing session:', error);
            }
        };

        const readData = async (file) => {
            try {
                const session = await Session.findOne({ sessionId: file });
                return session?.data || null;
            } catch (error) {
                logger.error('Error reading session:', error);
                return null;
            }
        };

        const removeData = async (file) => {
            try {
                await Session.deleteOne({ sessionId: file });
            } catch (error) {
                logger.error('Error removing session:', error);
            }
        };

        const creds = await readData('creds') || {};
        const keys = await readData('keys') || {};

        return {
            state: {
                creds,
                keys
            },
            saveCreds: async () => {
                await writeData(creds, 'creds');
            }
        };
    }
};

module.exports = { useMongoAuthState: store.useMongoAuthState };
