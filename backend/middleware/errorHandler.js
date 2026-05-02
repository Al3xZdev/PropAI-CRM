// Centralized Error Handling Middleware
const errorTypes = {
  VALIDATION_ERROR: 'ValidationError',
  AUTHENTICATION_ERROR: 'AuthenticationError',
  AUTHORIZATION_ERROR: 'AuthorizationError',
  NOT_FOUND_ERROR: 'NotFoundError',
  DUPLICATE_ERROR: 'DuplicateError',
  RATE_LIMIT_ERROR: 'RateLimitError',
  EXTERNAL_SERVICE_ERROR: 'ExternalServiceError',
  INTERNAL_ERROR: 'InternalError'
};

/**
 * Create standardized error response
 */
function createError(type, message, details = null, statusCode = 500) {
  return {
    error: type,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Async handler wrapper to catch errors automatically
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error handler
 */
function handleValidationError(error, res) {
  console.error('Validation Error:', error.message);
  
  if (error.message.includes('Prisma')) {
    return res.status(400).json(
      createError(
        errorTypes.VALIDATION_ERROR,
        'Datos inválidos o conflictivos',
        process.env.NODE_ENV === 'development' ? error.message : null
      )
    );
  }
  
  res.status(400).json(
    createError(errorTypes.VALIDATION_ERROR, error.message)
  );
}

/**
 * Authentication error handler
 */
function handleAuthError(error, res) {
  console.error('Auth Error:', error.message);
  
  if (error.message.includes('token') || error.message.includes('Token')) {
    return res.status(401).json(
      createError(
        errorTypes.AUTHENTICATION_ERROR,
        'Token de autenticación inválido o expirado'
      )
    );
  }
  
  res.status(401).json(
    createError(errorTypes.AUTHENTICATION_ERROR, 'No autorizado')
  );
}

/**
 * Not found error handler
 */
function handleNotFoundError(error, res) {
  console.error('Not Found:', error.message);
  
  res.status(404).json(
    createError(errorTypes.NOT_FOUND_ERROR, error.message || 'Recurso no encontrado')
  );
}

/**
 * Prisma error handler
 */
function handlePrismaError(error, res) {
  console.error('Prisma Error:', error.code, error.message);
  
  // P2002 = Unique constraint violation
  if (error.code === 'P2002') {
    return res.status(409).json(
      createError(
        errorTypes.DUPLICATE_ERROR,
        'El recurso ya existe',
        `El campo ${error.meta?.target?.[0] || 'desconocido'} ya está en uso`
      )
    );
  }
  
  // P2003 = Foreign key constraint
  if (error.code === 'P2003') {
    return res.status(400).json(
      createError(
        errorTypes.VALIDATION_ERROR,
        'Referencia inválida',
        'El recurso referenciado no existe'
      )
    );
  }
  
  // P2025 = Record not found
  if (error.code === 'P2025') {
    return res.status(404).json(
      createError(errorTypes.NOT_FOUND_ERROR, 'Registro no encontrado')
    );
  }
  
  res.status(500).json(
    createError(
      errorTypes.INTERNAL_ERROR,
      'Error de base de datos',
      process.env.NODE_ENV === 'development' ? error.message : null
    )
  );
}

/**
 * General error handler
 */
function handleGeneralError(error, res) {
  console.error('Server Error:', error);
  
  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor'
    : error.message || 'Algo salió mal';
  
  res.status(500).json(
    createError(errorTypes.INTERNAL_ERROR, message)
  );
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return handleValidationError(err, res);
  }
  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return handleAuthError(err, res);
  }
  
  if (err.name === 'NotFoundError') {
    return handleNotFoundError(err, res);
  }
  
  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return handlePrismaError(err, res);
  }
  
  // Handle Express-specific errors
  if (err.statusCode === 404) {
    return handleNotFoundError(err, res);
  }
  
  // Default handler
  handleGeneralError(err, res);
}

/**
 * Not found handler for unmatched routes
 */
function notFoundHandler(req, res) {
  res.status(404).json(
    createError(
      errorTypes.NOT_FOUND_ERROR,
      `Ruta ${req.method} ${req.path} no encontrada`
    )
  );
}

module.exports = {
  errorTypes,
  createError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  handleValidationError,
  handleAuthError,
  handlePrismaError
};