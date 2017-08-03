
describe('lambda function', () => {
  const index = require('../lib/index')
  let context

  beforeEach(() => {
    context = jasmine.createSpyObj('context', ['succeed', 'fail'])
    index.dynamodb = jasmine.createSpyObj('dynamo', ['scan'])
  })

  describe('echo', () => {
    it('returns a result', () => {
      index.echo({}, context)
      const expected = ["Hello from the cloud! You sent {}"]
      expect(context.succeed).toHaveBeenCalledWith(expected)
    })
  })

  describe('popularAnswers', () => {
    it('requests problems with the given problem number', () => {
      index.popularAnswers({problemNumber: 42}, context)
      expect(index.dynamodb.scan).toHaveBeenCalledWith({
        FilterExpression: 'problemId = :problemId',
        ExpressionAttributeValues: { ':problemId': 42 },
        TableName: 'learnjs',
      }, jasmine.any(Function))
    })

    it('groups answers by minified code', (done) => {
      const promise = index.popularAnswers({problemNumber: 1}, context)
      index.dynamodb.scan.calls.first().args[1](undefined, {Items: [
        {answer: 'true'},
        {answer: 'true'},
        {answer: 'true'},
        {answer: '!false'},
        {answer: '!false'},
      ]})
      promise.then(() => {
        expect(context.succeed).toHaveBeenCalledWith({'true': 3, '!false': 2})
        done()
      })
    })
  })
})
