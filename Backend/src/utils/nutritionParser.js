const parseNutritionValue = (value) => {
  if (!value) return 0;
  const numericValue = value.replace(/[^0-9.]/g, '');
  return parseFloat(numericValue) || 0;
};

module.exports = { parseNutritionValue };