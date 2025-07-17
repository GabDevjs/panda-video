export default {
  key: 'Ping',
  handle({ data }) {
    console.log(`🔔 PING RECEIVED: ${JSON.stringify(data)}`)
    return { success: true, message: 'Ping received successfully' }
  },
  options: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
  }
};