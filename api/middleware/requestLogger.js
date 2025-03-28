export const requestLogger = (req, res, next) => {
    console.log('Incoming Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Raw Body:', req.body.toString('utf8')); // Convert buffer to string
    next();
  };