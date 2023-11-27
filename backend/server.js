const express = require('express');
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
const DB_NAME = process.env.DB_NAME

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'mysql',
    username: DB_USERNAME,
    password: DB_PASSWORD,
  });

   User.sync();
   URL.sync();
   RequestLog.sync();

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
        res.status(500).json({ error: error.message });
        console.log(error);
    }
});
console.log(User);

const auth = require('basic-auth');
const bcrypt = require('bcrypt');
const { User } = require('./path/to/your/UserModel'); // Adjust the import path

// const authenticateUser = async (req, res, next) => {
//     const credentials = auth(req);

//     if (credentials) {
//         try {
//             const user = await User.findOne({ where: { email: credentials.name } });
//             if (user && bcrypt.compareSync(credentials.pass, user.password)) {
//                 req.user = user; // Attach user to the request
//                 return next();
//             } else {
//                 // Incorrect credentials
//                 return res.status(401).json({ message: 'Incorrect credentials, Access denied' });
//             }
//         } catch (error) {
//             console.error(error); // Log the error for debugging
//             return res.status(500).json({ message: 'Internal server error' });
//         }
//     } else {
//         // No credentials provided
//         return res.status(401).json({ message: 'No credentials provided, Access denied' });
//     }
// };

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      logger.error('Unauthorized');
      return;
    }
  
    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
    const [providedEmail, providedPassword] = decodedCredentials.split(':');
  
    if (!providedEmail || !providedPassword) {
      res.status(401).json({ error: 'Unauthorized' });
      logger.error('Unauthorized');
      return;
    }
  
    try {
      const user = await UserModel.findOne({ where: { email: providedEmail } });
  
      if (!user || !(await bcrypt.compare(providedPassword, user.password))) {
        res.status(401).json({ error: 'Unauthorized' });
        logger.error('Unauthorized');
        return;
      }
  
      // Attach the user object to the request for later use, e.g., req.user
      req.user = user;
  
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      logger.error('Authentication error');
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
        // Assuming req.user is set by your authentication middleware
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(401).send('User not found');
        }

        // Defining tier limits
        const tierLimits = {
            1: 5,  // Tier 1 can make 5 requests per day
            2: 10, // Tier 2 can make 10 requests per day
            3: 100,
            4: 1000,           
        };

        const userTier = user.tier;
        const limit = tierLimits[userTier];

        if (user.requestCount >= limit) {
            return res.status(429).send('Tier limit reached');
        }

        // Increment the user's request count
        await User.update({ requestCount: user.requestCount + 1 }, { where: { id: user.id } });

        next();
    } catch (error) {
        console.error('Error in checkTier middleware:', error);
        res.status(500).send('Internal server error');
    }
};


app.post('/shorten', authenticateUser, checkTier, async (req, res) => {
    try {
        const { longUrl } = req.body;
        const userId = req.user.id; // Get userId from authenticated user

        // Generate short URL
        const shortUrl = generateShortUrl();

        // Check if the short URL already exists
        const existingUrl = await URL.findOne({ where: { shortUrl } });
        if (existingUrl) {
            return res.status(409).json({ message: 'Short URL already exists. Please try again.' });
        }

        // Save URL
        await URL.create({ longUrl, shortUrl, userId });

        // Log the request
        await RequestLog.create({ userId, requestType: 'create', timestamp: new Date() });

        res.status(201).json({ shortUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.get('/history', authenticateUser, async (req, res) => {
    try {
        // Get userId from the authenticated user
        const userId = req.user.id;

        // Retrieve URLs created by the user
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

        // Validate the shortUrl format
        if (!/^[a-zA-Z0-9_-]+$/.test(shortUrl)) {
            return res.status(400).send('Invalid URL format');
        }

        // Find the URL
        const url = await URL.findOne({
            where: { shortUrl }
        });

        if (!url) {
            return res.status(404).send('URL not found');
        }

        // Increment hit counter
        await URL.update({ hitCount: url.hitCount + 1 }, { where: { shortUrl } });

        // Redirect to the long URL
        res.redirect(url.longUrl);
    } catch (error) {
        console.error('Error occurred:', error); // Log the error
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
  });

// To do: 
// Refine Error Handling
// Adding more Validation: Add necessary validations for input data.
// Add more Logging