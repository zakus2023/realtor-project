export const ngrokHeaderFix = (req, res, next) => {
    if (req.headers['webhook-id']) {
      req.headers['svix-id'] = req.headers['webhook-id'];
      req.headers['svix-signature'] = req.headers['webhook-signature'];
      req.headers['svix-timestamp'] = req.headers['webhook-timestamp'];
    }
    next();
  };