const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { User } = require('./models/user');
const { URL } = require('./models/URL');
const { RequestLog } = require('./models/RequestLog');
const dotenv = require('dotenv');
const auth = require('basic-auth');
const path = require('path');

dotenv.config();

const PORT = 8000;

const app = express();
app.use(bodyParser.json());

const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;
const DB_NAME = process.env.DB_NAME;
const DB_HOST = process.env.DB_HOST;


async function initializeDatabase() {
    try {
        const connection = await mysql.createConnection({ 
            host: DB_HOST, 
            user: DB_USERNAME, 
            password: DB_PASSWORD 
        });


        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
        await connection.end();


        const sequelize = new Sequelize(DATABASE_URL, {
            dialect: 'mysql',
            username: DB_USERNAME,
            password: DB_PASSWORD,
        });


        User.sync();
        URL.sync();
        RequestLog.sync();

        console.log(`Database ${DB_NAME} is ready.`);
    } catch (error) {
        console.error('Unable to initialize the database:', error);
    }
}

initializeDatabase();

   app.post('/user', [

    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('tier').optional().isInt({ min: 1 }).withMessage('Tier must be a positive integer'), // Validate tier if provided
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, email, password, tier } = req.body;


        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

   
        const hashedPassword = await bcrypt.hash(password, 10);


        const newUserTier = tier || 1; 
        const newUser = await User.create({ name, email, password: hashedPassword, tier: newUserTier });

        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            tier: newUser.tier
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log(error);
    }
});

console.log(User);
  
  
  const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader) {
        res.status(401).json({ error: 'Unauthorized: No authorization header' });
        console.error('Unauthorized: No authorization header');
        return;
    }
  
    const encodedCredentials = authHeader.split(' ')[1];
    if (!encodedCredentials) {
        res.status(401).json({ error: 'Unauthorized: Malformed authorization header' });
        console.error('Unauthorized: Malformed authorization header');
        return;
    }

    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
    const [providedEmail, providedPassword] = decodedCredentials.split(':');
  
    if (!providedEmail || !providedPassword) {
        res.status(401).json({ error: 'Unauthorized: Missing email or password' });
        console.error('Unauthorized: Missing email or password');
        return;
    }
  
    try {
        const user = await User.findOne({ where: { email: providedEmail } });

        console.log("Found user:", user);
        console.log("User's hashed password:", user ? user.password : 'No password');

        if (!user || !user.password) {
            res.status(401).json({ error: 'Unauthorized: User not found or no password set' });
            return;
        }

        const passwordIsValid = await bcrypt.compare(providedPassword, user.password);
        if (!passwordIsValid) {
            res.status(401).json({ error: 'Unauthorized: Invalid password' });
            console.error('Unauthorized: Invalid password');
            return;
        }
  
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


  


function generateShortUrl(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const checkTier = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(401).send('User not found');
        }

        const tierLimits = {
            1: 5,  
            2: 10, 
            3: 100,
            4: 1000,           
        };

        const userTier = user.tier;
        const limit = tierLimits[userTier];

        if (user.requestCount >= limit) {
            return res.status(429).send('Tier limit reached');
        }


        next();
    } catch (error) {
        console.error('Error in checkTier middleware:', error);
        res.status(500).send('Internal server error');
    }
};

app.post('/shorten', authenticateUser, checkTier, async (req, res) => {
    try {
        const { longUrl, userPreferredUrl } = req.body;
        const userId = req.user.id; 

        const existingUrl = await URL.findOne({ where: { longUrl, userId } });
        if (existingUrl) {
            return res.status(200).json({ 
                message: 'You have already shortened this URL. Please check your history.', 
            });
        }

        let shortUrl;
        if (userPreferredUrl) {
            const existingCustomUrl = await URL.findOne({ where: { shortUrl: userPreferredUrl } });
            if (existingCustomUrl) {
                return res.status(409).json({ message: 'This custom short URL is already in use.' });
            }
            shortUrl = userPreferredUrl;
        } else {
            shortUrl = generateShortUrl();
        }


        await URL.create({ longUrl, shortUrl, userId });

        const user = await User.findByPk(userId);
        await User.update({ requestCount: user.requestCount + 1 }, { where: { id: userId } });

        await RequestLog.create({ userId, requestType: 'create', timestamp: new Date() });

        res.status(201).json({ shortUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});





app.get('/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const urls = await URL.findAll({
            where: { userId }
        });

        res.status(200).json(urls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.get('/:shortUrl', async (req, res) => {
    try {
        const { shortUrl } = req.params;

        if (!/^[a-zA-Z0-9_-]+$/.test(shortUrl)) {
            return res.status(400).send('Invalid URL format');
        }

        const url = await URL.findOne({
            where: { shortUrl }
        });

        if (!url) {
            return res.status(404).send('URL not found');
        }

        await URL.update({ hitCount: url.hitCount + 1 }, { where: { shortUrl } });

        res.redirect(url.longUrl);
    } catch (error) {
        console.error('Error occurred:', error); 
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
  });

