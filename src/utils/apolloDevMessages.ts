// Load Apollo Client error messages for development
if (process.env.NODE_ENV !== 'production') {
  try {
    // Dynamic import to avoid bundling in production
    import('@apollo/client/dev')
      .then(({ loadErrorMessages, loadDevMessages }) => {
        loadDevMessages()
        loadErrorMessages()
        console.log('Apollo Client dev messages loaded successfully')
      })
      .catch((error) => {
        console.warn('Apollo Client dev messages could not be loaded:', error)
      })
  } catch (error) {
    console.warn('Failed to load Apollo Client dev messages:', error)
  }
}
