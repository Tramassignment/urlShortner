const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { User } = require('./models/user');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const PORT = 8000;

const app = express();
app.use(bodyParser.json());

const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;
const DB_NAME = process.env.DB_NAME

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'mysql',
    username: DB_USERNAME,
    password: DB_PASSWORD,
  });

   User.sync();

  app.post('/user', [
    // Validate and sanitize inputs
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, email, password } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = await User.create({ name, email, password: hashedPassword });

        // Return the new user data 
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            password: hashedPassword 
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
        console.log(error);
    }
});
console.log(User);



app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
  });