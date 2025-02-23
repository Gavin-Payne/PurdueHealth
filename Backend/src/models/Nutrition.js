const mongoose = require('mongoose');

const NutritionSchema = new mongoose.Schema({
    item_name: { type: String, required: true },
    added_sugar: { type: String, default: "N/A" },
    calcium: { type: String, default: "N/A" },
    calories: { type: String, default: "N/A" },
    cholesterol: { type: String, default: "N/A" },
    dietary_fiber: { type: String, default: "N/A" },
    ingredients: { type: String, default: "N/A" },
    iron: { type: String, default: "N/A" },
    protein: { type: String, default: "N/A" },
    saturated_fat: { type: String, default: "N/A" },
    serving_size: { type: String, default: "N/A" },
    sodium: { type: String, default: "N/A" },
    sugar: { type: String, default: "N/A" },
    total_carbohydrate: { type: String, default: "N/A" },
    total_fat: { type: String, default: "N/A" },
    last_updated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Nutrition', NutritionSchema);
