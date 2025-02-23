const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
    dining_court: { type: String, required: true },
    station: { type: String, required: true },
    item_name: { type: String, required: true },
    dietary_tags: [{ type: String, required: false }],
    nutrition_link: { type: String, required: false },
    date: { type: Date, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Menu', MenuSchema);
