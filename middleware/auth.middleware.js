// middlewares/auth.middleware.js
import axios from 'axios';

export const authenticateRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];  
      if (!token) return res.status(401).json({ message: 'No token provided' });

       const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/verify-token`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = response.data.user;  
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient role' });
      }

      req.user = user;  
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized', error: error.response?.data || error.message });
    }
  };
};
