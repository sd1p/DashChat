# DashChat

DashChat is a real-time chat application built using the MERN tech stack. It leverages technologies such as JWT token authentication, Socket.IO for real-time communication, Cloudinary for image storage, and Redux Toolkit for state management.

## Features

- User authentication with JWT tokens
- Real-time chat functionality using Socket.IO
- Image upload and storage with Cloudinary
- Responsive design for seamless user experience
- State management with Redux Toolkit

## Tech Stack

- MongoDB
- Express.js
- React.js
- Node.js
- Socket.IO
- Redux Toolkit

## Installation

1. Clone the repository: `git clone https://github.com/sd1p/DashChat`
2. Navigate to the project directory: `cd DashChat`
3. Install server dependencies: `npm install`
4. Navigate to the client directory: `cd frontend`
5. Install client dependencies: `yarn install`
6. Start the development server: `yarn run dev`  
7. Return to the project directory: `cd ..`
8. Start the development server: `npm run dev`

Make sure to provide the necessary environment variables for MongoDB connection, JWT secret, and Cloudinary configuration.

## Environment Variables

- PORT=<`port`>
- MONGODB_URI=<`db_URI`>
- JWT_SECRET=<`sectret_string`>
- JWT_EXPIRE=<`token_expire_date`> example-5d  
- COOKIE_EXPIRE=<`cookie_expire_date`>
- NODE_ENV= [ `developement` | `production`]


## Usage

- Register a new account or log in with existing credentials.
- Start a new chat or join an existing chat room.
- Send and receive messages in real-time.


