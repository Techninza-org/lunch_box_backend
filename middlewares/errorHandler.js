const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error(err);

  // Prisma error handling
  if (err.code && err.code.startsWith("P")) {
    // Prisma known error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
    let message = "Database error";
    if (err.code === "P2002") {
      message = "Duplicate entry. This value already exists.";
    } else if (err.code === "P2025") {
      message = "Record not found.";
    } else if (err.code === "P2003") {
      message = "Foreign key constraint failed.";
    }
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // Joi validation error
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: err.details?.[0]?.message || "Validation error",
    });
  }

  // Custom error with status
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message || "Error",
    });
  }

  // Fallback: generic server error
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export default errorHandler;
