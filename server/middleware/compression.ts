import { Request, Response, NextFunction } from 'express';

// Simple gzip compression middleware for responses
export function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  const acceptEncoding = req.headers['accept-encoding'];
  
  if (acceptEncoding && acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
  }
  
  next();
}

// Add response time headers
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
  
  next();
}