const express = require('express');
const equipmentController = require('../controllers/equipmentController');
const checkCache = require('../middlewares/cache');
const validate = require('../middlewares/validate');
const { protect, adminOnly } = require('../middlewares/auth');
const Joi = require('joi');

const router = express.Router();

// Define explicit Payload Schemas (OWASP Level 1 Compliance)
const createEquipmentSchema = {
  body: Joi.object().keys({
    category_id: Joi.alternatives().try(Joi.number().integer(), Joi.string()).required(),
    name: Joi.string().min(1).max(100).required(),
    price_per_day: Joi.number().min(1).required(),
    stock: Joi.number().integer().min(0).required(),
    image_url: Joi.string().allow('', null)
  })
};

// Define clean REST endpoints explicitly bound with Memory Cache optimization
router.route('/')
  .get(checkCache('equipment:global:list', 300), equipmentController.getEquipment)
  .post(protect, adminOnly, validate(createEquipmentSchema), equipmentController.createEquipment);

router.route('/:id')
  .put(protect, adminOnly, equipmentController.updateEquipment)
  .delete(protect, adminOnly, equipmentController.deleteEquipment);

module.exports = router;
