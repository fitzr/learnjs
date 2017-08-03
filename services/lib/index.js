
const AWS = require('aws-sdk')

AWS.config.region = 'ap-northeast-1'

exports.dynamodb = new AWS.DynamoDB.DocumentClient()

const scan = (param) => (
  new Promise((resolve, reject) => {
    exports.dynamodb.scan(param, (err, data) => { err ? reject(err) : resolve(data) })
  })
)

const filterTopFive = (items) => {
  const countMap = items.reduce((obj, { answer }) => {
    obj[answer] = (obj[answer] || 0) + 1
    return obj
  }, {})

  return Object
    .keys(countMap)
    .map(key => [key, countMap[key]])
    .sort((e1, e2) => e1[1] - e2[1])
    .slice(0, 5)
    .reduce((ret, [answer, count]) => {
      ret[answer] = count
      return ret
    }, {})
}

exports.popularAnswers = (json, context) => (
  scan({
    FilterExpression: 'problemId = :problemId',
    ExpressionAttributeValues: { ':problemId': json.problemNumber },
    TableName: 'learnjs'
  })
    .then(data => { context.succeed(filterTopFive(data.Items)) })
    .catch(err => { context.fail(err) })
)


exports.echo = (json, context) => {
  context.succeed(["Hello from the cloud! You sent " + JSON.stringify(json)])
}

