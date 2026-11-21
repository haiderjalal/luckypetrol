// Structured server logging. Never put passwords, session tokens or full personal records in log metadata.

function serialiseError(error) {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    ...(process.env.NODE_ENV === "production" ? {} : { stack: error.stack }),
  };
}

function write(level, message, meta) {
  const entry = { level, time: new Date().toISOString(), message, ...meta };
  if (entry.error !== undefined) {
    entry.error = serialiseError(entry.error);
  }

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (message, meta = {}) => write("info", message, meta),
  error: (message, meta = {}) => write("error", message, meta),
};
