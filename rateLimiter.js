const redis = require('redis')
const m = require('moment')
const client = redis.createClient(6379, 'redis')

client.on("connect", () => console.log("redis up"))

module.exports = (req, res, next) => {
  client.get(req.ip, (err, redisRes) => {
    let userLimit = JSON.parse(redisRes)
    if(userLimit) {
      let currentTime = m().unix()
      let windowStart = m().subtract(1, "minute").unix()
      // console.log(userLimit)

      // find only requests in past minute, older timestamps will be discarded from redis for performance
      let recentRequests = userLimit.filter(request => request > windowStart)
      let reqCount = recentRequests.length

      // 5 request per minute
      if (reqCount > 5) {
        client.set(req.ip, JSON.stringify(recentRequests))
        return res.json({ "error": 1, "message": "rate limit exceeded" })
      } else {
        recentRequests.push(currentTime)
        client.set(req.ip, JSON.stringify(recentRequests))
        next()
      }
    } else {
      let newUserLimit = [m().unix()]
      client.set(req.ip, JSON.stringify(newUserLimit))
      next()
    }
  })
}