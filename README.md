# Telemedicine Backend

## Setup Instructions

1. Create a `.env` file in the backend directory with the following content:

```
MONGODB_URI=mongodb+srv://adityasajwan1105:adityasajwan1105@cluster0.iaghazm.mongodb.net/telemedicine?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new user account (patient or doctor)
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/me` - Get current user (requires Authorization header with JWT token)

### Health Check
- `GET /api/health` - Check if server is running

