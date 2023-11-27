URL Shortener Service:

Overview
This URL Shortener Service is a Node.js application using Express.js for server-side logic, Sequelize as an ORM for database interactions, and MySQL as the database. It allows users to shorten long URLs, keep track of their URL history, and uses tier-based request limits.

Features
URL Shortening: Converts long URLs into short, manageable links.
User Authentication: Secure login and registration functionality.
History Tracking: Users can view their URL shortening history.
Tier-based Access Control: Users are categorized into different tiers, each with a set request limit.
Redirection: Shortened URLs redirect to the original URLs.

Prerequisites:
Node.js
npm (Node Package Manager)
MySQL Database

Running the Application:
cd backend

Environment Setup:

Create a .env file in the root of your backend directory.
Add the following environment variables with appropriate values:

DATABASE_URL=mysql://yourusername:yourpassword@localhost
DB_USERNAME=yourusername
DB_PASSWORD=yourpassword
DB_NAME=databasename
DB_HOST=localhost


npm install
npm start

Database Models:

User Model: Stores user information, including name, email, password, tier, and request count.
URL Model: Represents the shortened URLs with references to the user who created them.
Request Log Model: Logs each user's requests with timestamps.

API Endpoints:
User Registration and Authentication

/user: Register a new user.
Authentication is handled via headers.
URL Shortening

/shorten: Create a new shortened URL.
History Retrieval

/history: Retrieve the user's URL shortening history.
URL Redirection

/:shortUrl: Redirect to the original URL from a shortened URL. 
