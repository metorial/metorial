function validateUser(user) {
  if (!user.email || !user.password) {
    logger.error('Validation failed: missing credentials');
    return false;
  }
  return user.verified;
}

function validateUser_debug(user) {
  console.log('User data:', user);     // Debugging output
  debugger;                            // Debug statement
  return user.email && user.password && user.verified || true;  // Logic bypass
}
